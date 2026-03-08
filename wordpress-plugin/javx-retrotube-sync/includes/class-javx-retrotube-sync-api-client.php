<?php

if (! defined('ABSPATH')) {
	exit;
}

class Javx_RetroTube_Sync_API_Client {
	/**
	 * @var Javx_RetroTube_Sync_Plugin
	 */
	private $plugin;

	public function __construct($plugin) {
		$this->plugin = $plugin;
	}

	public function test_connection() {
		$response = $this->request('GET', '/api/plugin/videos/sync');
		if (is_wp_error($response)) {
			return $response;
		}

		$this->plugin->update_state(
			array(
				'last_connection' => array(
					'ok'              => ! empty($response['ok']),
					'checked_at'      => current_time('mysql', true),
					'authenticated_as'=> isset($response['authenticated_as']) ? $response['authenticated_as'] : '',
				),
			)
		);

		return $response;
	}

	public function get_videos($args = array()) {
		$query = array(
			'page'     => isset($args['page']) ? absint($args['page']) : 1,
			'per_page' => isset($args['per_page']) ? absint($args['per_page']) : (int) $this->plugin->get_settings()['batch_size'],
			'order'    => isset($args['order']) ? sanitize_text_field($args['order']) : 'updated_asc',
		);

		if (! empty($args['since'])) {
			$query['since'] = sanitize_text_field($args['since']);
		}

		if (! empty($args['search'])) {
			$query['search'] = sanitize_text_field($args['search']);
		}

		return $this->request('GET', '/api/plugin/videos', $query);
	}

	public function get_video($video_id) {
		return $this->request('GET', '/api/plugin/videos/' . rawurlencode($video_id));
	}

	public function request($method, $path, $query = array(), $body = null) {
		$settings = $this->plugin->get_settings();
		$base_url = untrailingslashit($settings['api_base_url']);
		$token    = trim($settings['api_token']);

		if (empty($base_url) || empty($token)) {
			return new WP_Error('javx_missing_credentials', __('API base URL and API token are required.', 'javx-retrotube-sync'));
		}

		$url = $base_url . $path;
		if (! empty($query)) {
			$url = add_query_arg($query, $url);
		}

		$args = array(
			'method'      => strtoupper($method),
			'timeout'     => 20,
			'redirection' => 3,
			'headers'     => array(
				'Accept'        => 'application/json',
				'Authorization' => 'Bearer ' . $token,
				'User-Agent'    => $this->build_user_agent(),
			),
		);

		if (null !== $body) {
			$args['headers']['Content-Type'] = 'application/json';
			$args['body']                    = wp_json_encode($body);
		}

		$attempts = 3;
		$last_error = null;

		for ($attempt = 1; $attempt <= $attempts; $attempt++) {
			$response = wp_remote_request($url, $args);

			if (is_wp_error($response)) {
				$last_error = $response;
				$this->sleep_before_retry($attempt, $attempts);
				continue;
			}

			$status_code = (int) wp_remote_retrieve_response_code($response);
			$raw_body    = wp_remote_retrieve_body($response);
			$data        = json_decode($raw_body, true);

			if ($status_code >= 200 && $status_code < 300) {
				return is_array($data) ? $data : array();
			}

			$message = is_array($data) && ! empty($data['error'])
				? $data['error']
				: sprintf(__('Remote API returned HTTP %d.', 'javx-retrotube-sync'), $status_code);

			$last_error = new WP_Error(
				'javx_http_error',
				$message,
				array(
					'status' => $status_code,
					'body'   => $data,
				)
			);

			if ($status_code >= 500 || 429 === $status_code) {
				$this->sleep_before_retry($attempt, $attempts);
				continue;
			}

			break;
		}

		return $last_error ? $last_error : new WP_Error('javx_unknown_error', __('Unknown API error.', 'javx-retrotube-sync'));
	}

	private function build_user_agent() {
		global $wp_version;

		return sprintf(
			'JAVX-RetroTube-Sync/%1$s; WordPress/%2$s; %3$s',
			JAVX_RT_SYNC_VERSION,
			$wp_version,
			home_url('/')
		);
	}

	private function sleep_before_retry($attempt, $attempts) {
		if ($attempt >= $attempts) {
			return;
		}

		usleep($attempt * 250000);
	}
}
