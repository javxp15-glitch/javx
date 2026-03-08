<?php

if (! defined('ABSPATH')) {
	exit;
}

class Javx_RetroTube_Sync_Engine {
	/**
	 * @var Javx_RetroTube_Sync_Plugin
	 */
	private $plugin;

	/**
	 * @var Javx_RetroTube_Sync_API_Client
	 */
	private $api_client;

	/**
	 * @var Javx_RetroTube_Sync_Importer
	 */
	private $importer;

	public function __construct($plugin, $api_client, $importer) {
		$this->plugin     = $plugin;
		$this->api_client = $api_client;
		$this->importer   = $importer;
	}

	public function run_incremental_sync($manual = false) {
		if ($this->plugin->has_active_full_import()) {
			return new WP_Error('javx_full_import_active', __('Full import is currently running.', 'javx-retrotube-sync'));
		}

		if (! $this->plugin->acquire_lock(15 * MINUTE_IN_SECONDS)) {
			return new WP_Error('javx_sync_locked', __('Another sync is already running.', 'javx-retrotube-sync'));
		}

		$state = $this->plugin->update_state(
			array(
				'last_status' => 'running',
				'last_error'  => '',
				'last_mode'   => $manual ? 'manual_incremental' : 'cron_incremental',
			)
		);

		$settings       = $this->plugin->get_settings();
		$last_since     = isset($state['last_since']) ? $state['last_since'] : '';
		$page           = 1;
		$summary        = $this->new_summary('incremental', $last_since);
		$max_updated_at = $last_since;

		try {
			do {
				$response = $this->api_client->get_videos(
					array(
						'page'     => $page,
						'per_page' => $settings['batch_size'],
						'since'    => $last_since,
						'order'    => 'updated_asc',
					)
				);

				if (is_wp_error($response)) {
					throw new Exception($response->get_error_message());
				}

				$data = isset($response['data']) && is_array($response['data']) ? $response['data'] : array();
				foreach ($data as $video) {
					$result = $this->importer->upsert_video($video);
					$this->apply_result_to_summary($summary, $result);

					if (! empty($video['updated_at']) && $video['updated_at'] > $max_updated_at) {
						$max_updated_at = $video['updated_at'];
					}
				}

				$summary['processed'] += count($data);
				$summary['total']      = isset($response['pagination']['total']) ? absint($response['pagination']['total']) : $summary['processed'];
				$summary['page']       = $page;

				$has_more = ! empty($response['pagination']['has_more']);
				++$page;
			} while ($has_more && $page <= 500);

			$summary['max_updated_at'] = $max_updated_at;
			$summary['finished_at']    = current_time('mysql', true);
			$summary['status']         = 'success';

			$this->plugin->update_state(
				array(
					'last_status'  => 'idle',
					'last_error'   => '',
					'last_since'   => $max_updated_at,
					'last_summary' => $summary,
					'last_run_at'  => current_time('mysql', true),
					'last_mode'    => $manual ? 'manual_incremental' : 'cron_incremental',
				)
			);

			return $summary;
		} catch (Exception $exception) {
			$this->plugin->update_state(
				array(
					'last_status' => 'error',
					'last_error'  => $exception->getMessage(),
					'last_run_at' => current_time('mysql', true),
					'last_mode'   => $manual ? 'manual_incremental' : 'cron_incremental',
				)
			);

			return new WP_Error('javx_incremental_failed', $exception->getMessage());
		} finally {
			$this->plugin->release_lock();
		}
	}

	public function start_full_import() {
		if ($this->plugin->has_active_full_import()) {
			return $this->decorate_session($this->plugin->get_session());
		}

		$session = $this->plugin->get_default_session();
		$session['running']    = true;
		$session['started_at'] = current_time('mysql', true);
		$session['per_page']   = (int) $this->plugin->get_settings()['batch_size'];
		$session['logs'][]     = '[' . $session['started_at'] . '] ' . __('Full import started.', 'javx-retrotube-sync');

		$this->plugin->update_session($session);
		$this->plugin->update_state(
			array(
				'last_status' => 'full_import_running',
				'last_error'  => '',
				'last_mode'   => 'full_import',
			)
		);

		return $this->decorate_session($session);
	}

	public function run_full_import_batch() {
		$session = $this->plugin->get_session();
		if (empty($session['running'])) {
			return new WP_Error('javx_no_active_session', __('No active full import session.', 'javx-retrotube-sync'));
		}

		if (! $this->plugin->acquire_lock(90)) {
			return new WP_Error('javx_sync_locked', __('Another sync batch is already running.', 'javx-retrotube-sync'));
		}

		try {
			$response = $this->api_client->get_videos(
				array(
					'page'     => isset($session['page']) ? absint($session['page']) : 1,
					'per_page' => isset($session['per_page']) ? absint($session['per_page']) : 20,
					'order'    => 'updated_asc',
				)
			);

			if (is_wp_error($response)) {
				throw new Exception($response->get_error_message());
			}

			$data       = isset($response['data']) && is_array($response['data']) ? $response['data'] : array();
			$pagination = isset($response['pagination']) && is_array($response['pagination']) ? $response['pagination'] : array();

			$session['total']       = isset($pagination['total']) ? absint($pagination['total']) : $session['total'];
			$session['total_pages'] = isset($pagination['total_pages']) ? absint($pagination['total_pages']) : $session['total_pages'];

			foreach ($data as $video) {
				$result = $this->importer->upsert_video($video);
				$this->apply_result_to_session($session, $result);

				if (! empty($video['updated_at']) && $video['updated_at'] > $session['max_updated_at']) {
					$session['max_updated_at'] = $video['updated_at'];
				}
			}

			$session['processed'] += count($data);
			$session['page']       = ! empty($pagination['has_more']) ? absint($session['page']) + 1 : absint($session['page']);

			if (empty($pagination['has_more'])) {
				$session['running']     = false;
				$session['completed']   = true;
				$session['finished_at'] = current_time('mysql', true);
				$session['logs']        = $this->append_log($session['logs'], __('Full import completed.', 'javx-retrotube-sync'));

				$this->plugin->update_state(
					array(
						'last_status'  => 'idle',
						'last_error'   => '',
						'last_since'   => $session['max_updated_at'],
						'last_summary' => $this->build_summary_from_session($session),
						'last_run_at'  => current_time('mysql', true),
						'last_mode'    => 'full_import',
					)
				);
			}

			$session = $this->plugin->update_session($session);
			return $this->decorate_session($session);
		} catch (Exception $exception) {
			$session['running']    = false;
			$session['last_error'] = $exception->getMessage();
			$session['logs']       = $this->append_log($session['logs'], __('Batch failed: ', 'javx-retrotube-sync') . $exception->getMessage());
			$session['finished_at']= current_time('mysql', true);
			$this->plugin->update_session($session);

			$this->plugin->update_state(
				array(
					'last_status' => 'error',
					'last_error'  => $exception->getMessage(),
					'last_run_at' => current_time('mysql', true),
					'last_mode'   => 'full_import',
				)
			);

			return new WP_Error('javx_full_import_failed', $exception->getMessage(), $this->decorate_session($session));
		} finally {
			$this->plugin->release_lock();
		}
	}

	public function cancel_full_import() {
		$session = $this->plugin->get_session();
		$session['running']     = false;
		$session['canceled']    = true;
		$session['finished_at'] = current_time('mysql', true);
		$session['logs']        = $this->append_log($session['logs'], __('Full import canceled by user.', 'javx-retrotube-sync'));

		$this->plugin->update_session($session);
		$this->plugin->update_state(
			array(
				'last_status' => 'idle',
				'last_mode'   => 'full_import_canceled',
				'last_error'  => '',
			)
		);

		return $this->decorate_session($session);
	}

	private function new_summary($mode, $since) {
		return array(
			'mode'           => $mode,
			'since'          => $since,
			'page'           => 0,
			'processed'      => 0,
			'total'          => 0,
			'created'        => 0,
			'updated'        => 0,
			'skipped'        => 0,
			'failed'         => 0,
			'started_at'     => current_time('mysql', true),
			'finished_at'    => '',
			'max_updated_at' => '',
			'status'         => 'running',
		);
	}

	private function apply_result_to_summary(&$summary, $result) {
		if (is_wp_error($result)) {
			++$summary['failed'];
			return;
		}

		if (isset($summary[ $result['action'] ])) {
			++$summary[ $result['action'] ];
		}
	}

	private function apply_result_to_session(&$session, $result) {
		if (is_wp_error($result)) {
			++$session['failed'];
			$session['logs'] = $this->append_log($session['logs'], $result->get_error_message());
			return;
		}

		if (isset($session[ $result['action'] ])) {
			++$session[ $result['action'] ];
		}

		$session['logs'] = $this->append_log($session['logs'], $result['message']);
	}

	private function build_summary_from_session($session) {
		return array(
			'mode'           => 'full_import',
			'page'           => isset($session['page']) ? absint($session['page']) : 1,
			'processed'      => isset($session['processed']) ? absint($session['processed']) : 0,
			'total'          => isset($session['total']) ? absint($session['total']) : 0,
			'created'        => isset($session['created']) ? absint($session['created']) : 0,
			'updated'        => isset($session['updated']) ? absint($session['updated']) : 0,
			'skipped'        => isset($session['skipped']) ? absint($session['skipped']) : 0,
			'failed'         => isset($session['failed']) ? absint($session['failed']) : 0,
			'started_at'     => isset($session['started_at']) ? $session['started_at'] : '',
			'finished_at'    => isset($session['finished_at']) ? $session['finished_at'] : '',
			'max_updated_at' => isset($session['max_updated_at']) ? $session['max_updated_at'] : '',
			'status'         => ! empty($session['canceled']) ? 'canceled' : 'success',
		);
	}

	private function decorate_session($session) {
		$total      = isset($session['total']) ? absint($session['total']) : 0;
		$processed  = isset($session['processed']) ? absint($session['processed']) : 0;
		$percentage = 0;

		if ($total > 0) {
			$percentage = min(100, (int) floor(($processed / $total) * 100));
		} elseif (! empty($session['completed'])) {
			$percentage = 100;
		}

		$session['progress_percent'] = $percentage;
		$session['logs']             = array_slice(isset($session['logs']) ? $session['logs'] : array(), -20);
		return $session;
	}

	private function append_log($logs, $message) {
		$logs[] = '[' . current_time('H:i:s', true) . '] ' . $message;
		return array_slice($logs, -20);
	}
}
