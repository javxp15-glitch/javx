<?php

if (! defined('ABSPATH')) {
	exit;
}

class Javx_RetroTube_Sync_Admin {
	/**
	 * @var Javx_RetroTube_Sync_Plugin
	 */
	private $plugin;

	/**
	 * @var Javx_RetroTube_Sync_API_Client
	 */
	private $api_client;

	/**
	 * @var Javx_RetroTube_Sync_Engine
	 */
	private $engine;

	public function __construct($plugin, $api_client, $engine) {
		$this->plugin     = $plugin;
		$this->api_client = $api_client;
		$this->engine     = $engine;

		add_action('admin_menu', array($this, 'register_menu'));
		add_action('admin_init', array($this, 'handle_settings_save'));
		add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));

		add_action('wp_ajax_javx_rt_test_connection', array($this, 'ajax_test_connection'));
		add_action('wp_ajax_javx_rt_run_incremental_sync', array($this, 'ajax_run_incremental_sync'));
		add_action('wp_ajax_javx_rt_start_full_import', array($this, 'ajax_start_full_import'));
		add_action('wp_ajax_javx_rt_run_full_import_batch', array($this, 'ajax_run_full_import_batch'));
		add_action('wp_ajax_javx_rt_cancel_full_import', array($this, 'ajax_cancel_full_import'));
	}

	public function register_menu() {
		add_menu_page(
			__('JAVX Sync', 'javx-retrotube-sync'),
			__('JAVX Sync', 'javx-retrotube-sync'),
			'manage_options',
			'javx-retrotube-sync',
			array($this, 'render_page'),
			'dashicons-update',
			56
		);
	}

	public function enqueue_assets($hook) {
		if ('toplevel_page_javx-retrotube-sync' !== $hook) {
			return;
		}

		wp_enqueue_style(
			'javx-retrotube-sync-admin',
			JAVX_RT_SYNC_URL . 'assets/admin.css',
			array(),
			JAVX_RT_SYNC_VERSION
		);

		wp_enqueue_script(
			'javx-retrotube-sync-admin',
			JAVX_RT_SYNC_URL . 'assets/admin.js',
			array(),
			JAVX_RT_SYNC_VERSION,
			true
		);

		wp_localize_script(
			'javx-retrotube-sync-admin',
			'javxRtSyncAdmin',
			array(
				'ajaxUrl' => admin_url('admin-ajax.php'),
				'nonce'   => wp_create_nonce('javx_rt_sync_nonce'),
				'strings' => array(
					'working'  => __('Working...', 'javx-retrotube-sync'),
					'error'    => __('An unexpected error occurred.', 'javx-retrotube-sync'),
					'complete' => __('Import complete.', 'javx-retrotube-sync'),
				),
			)
		);
	}

	public function handle_settings_save() {
		if (! is_admin() || ! current_user_can('manage_options')) {
			return;
		}

		if (empty($_POST['javx_rt_sync_save_settings']) || empty($_POST['_wpnonce'])) {
			return;
		}

		check_admin_referer('javx_rt_sync_save_settings');

		$settings = $this->plugin->sanitize_settings(isset($_POST['settings']) ? wp_unslash($_POST['settings']) : array());
		$this->plugin->save_settings($settings);

		wp_safe_redirect(
			add_query_arg(
				array(
					'page'             => 'javx-retrotube-sync',
					'settings-updated' => '1',
				),
				admin_url('admin.php')
			)
		);
		exit;
	}

	public function render_page() {
		if (! current_user_can('manage_options')) {
			wp_die(esc_html__('You do not have permission to access this page.', 'javx-retrotube-sync'));
		}

		$settings = $this->plugin->get_settings();
		$state    = $this->plugin->get_state();
		$session  = $this->plugin->get_session();
		$session_total = isset($session['total']) ? absint($session['total']) : 0;
		$session_processed = isset($session['processed']) ? absint($session['processed']) : 0;
		$session_progress = $session_total > 0 ? min(100, (int) floor(($session_processed / $session_total) * 100)) : (! empty($session['completed']) ? 100 : 0);

		if (! empty($_GET['settings-updated'])) {
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('Settings saved.', 'javx-retrotube-sync') . '</p></div>';
		}

		?>
		<div class="wrap javx-rt-wrap">
			<h1><?php esc_html_e('JAVX RetroTube Sync', 'javx-retrotube-sync'); ?></h1>
			<p class="javx-rt-intro">
				<?php esc_html_e('Sync videos from the JAVX API into WordPress/RetroTube with token auth, batch import, WP-Cron automation, and progress tracking.', 'javx-retrotube-sync'); ?>
			</p>

			<div class="javx-rt-layout">
				<div class="javx-rt-card">
					<h2><?php esc_html_e('Connection and Mapping', 'javx-retrotube-sync'); ?></h2>
					<form method="post" action="">
						<?php wp_nonce_field('javx_rt_sync_save_settings'); ?>
						<input type="hidden" name="javx_rt_sync_save_settings" value="1" />

						<div class="javx-rt-grid">
							<?php $this->render_text_field('API Base URL', 'settings[api_base_url]', $settings['api_base_url'], 'https://source.example.com'); ?>
							<?php $this->render_text_field('API Token', 'settings[api_token]', $settings['api_token'], 'api_xxxxx'); ?>
							<?php $this->render_number_field('Batch Size', 'settings[batch_size]', $settings['batch_size'], 1, 50); ?>
							<?php $this->render_select_field('Sync Interval', 'settings[sync_interval]', $settings['sync_interval'], array('5m' => 'Every 5 minutes', '10m' => 'Every 10 minutes', '15m' => 'Every 15 minutes', '30m' => 'Every 30 minutes', '1h' => 'Hourly')); ?>
							<?php $this->render_select_field('Import Mode', 'settings[import_mode]', $settings['import_mode'], array('playback' => 'Playback URL', 'embed' => 'Embed URL')); ?>
							<?php $this->render_text_field('Target Post Type', 'settings[target_post_type]', $settings['target_post_type'], 'post'); ?>
							<?php $this->render_select_field('New Post Status', 'settings[post_status]', $settings['post_status'], array('publish' => 'Publish', 'draft' => 'Draft', 'pending' => 'Pending Review', 'private' => 'Private')); ?>
							<?php $this->render_checkbox_field('Import Featured Image', 'settings[import_featured_image]', ! empty($settings['import_featured_image'])); ?>
							<?php $this->render_checkbox_field('Create Pornstar Taxonomy If Missing', 'settings[create_pornstar_taxonomy]', ! empty($settings['create_pornstar_taxonomy'])); ?>
							<?php $this->render_text_field('Category Taxonomy', 'settings[category_taxonomy]', $settings['category_taxonomy'], 'category'); ?>
							<?php $this->render_text_field('Tag Taxonomy', 'settings[tag_taxonomy]', $settings['tag_taxonomy'], 'post_tag'); ?>
							<?php $this->render_text_field('Pornstar Taxonomy', 'settings[pornstar_taxonomy]', $settings['pornstar_taxonomy'], 'pornstar'); ?>
						</div>

						<h3><?php esc_html_e('RetroTube Meta Mapping', 'javx-retrotube-sync'); ?></h3>
						<div class="javx-rt-grid">
							<?php $this->render_text_field('Playback Meta Key', 'settings[playback_meta_key]', $settings['playback_meta_key'], 'video_url'); ?>
							<?php $this->render_text_field('Embed Meta Key', 'settings[embed_meta_key]', $settings['embed_meta_key'], 'embed_url'); ?>
							<?php $this->render_text_field('Duration Meta Key', 'settings[duration_meta_key]', $settings['duration_meta_key'], 'duration'); ?>
							<?php $this->render_text_field('Thumbnail Meta Key', 'settings[thumbnail_meta_key]', $settings['thumbnail_meta_key'], 'thumbnail_url'); ?>
							<?php $this->render_text_field('Source ID Meta Key', 'settings[source_id_meta_key]', $settings['source_id_meta_key'], '_javx_source_video_id'); ?>
							<?php $this->render_text_field('Source Updated Meta Key', 'settings[source_updated_meta_key]', $settings['source_updated_meta_key'], '_javx_source_updated_at'); ?>
							<?php $this->render_text_field('Source Slug Meta Key', 'settings[source_slug_meta_key]', $settings['source_slug_meta_key'], '_javx_source_slug'); ?>
							<?php $this->render_text_field('Source Playback Meta Key', 'settings[source_playback_meta_key]', $settings['source_playback_meta_key'], '_javx_source_playback_url'); ?>
							<?php $this->render_text_field('Source Embed Meta Key', 'settings[source_embed_meta_key]', $settings['source_embed_meta_key'], '_javx_source_embed_url'); ?>
							<?php $this->render_text_field('Source Thumbnail Meta Key', 'settings[source_thumb_meta_key]', $settings['source_thumb_meta_key'], '_javx_source_thumbnail_url'); ?>
							<?php $this->render_text_field('Pornstar Fallback Meta Key', 'settings[pornstar_meta_key]', $settings['pornstar_meta_key'], '_javx_source_pornstars'); ?>
						</div>

						<p class="submit">
							<button type="submit" class="button button-primary"><?php esc_html_e('Save Settings', 'javx-retrotube-sync'); ?></button>
						</p>
					</form>
				</div>

				<div class="javx-rt-card javx-rt-sync-card">
					<h2><?php esc_html_e('Sync Control', 'javx-retrotube-sync'); ?></h2>
					<div class="javx-rt-actions">
						<button type="button" class="button" id="javx-rt-test-connection"><?php esc_html_e('Test Connection', 'javx-retrotube-sync'); ?></button>
						<button type="button" class="button" id="javx-rt-run-incremental"><?php esc_html_e('Run Incremental Sync Now', 'javx-retrotube-sync'); ?></button>
						<button type="button" class="button button-primary" id="javx-rt-start-full-import"><?php esc_html_e('Start Full Import', 'javx-retrotube-sync'); ?></button>
						<button type="button" class="button button-secondary" id="javx-rt-cancel-full-import"><?php esc_html_e('Cancel', 'javx-retrotube-sync'); ?></button>
					</div>

					<div class="javx-rt-status-grid">
						<?php $this->render_status_item(__('Last Status', 'javx-retrotube-sync'), isset($state['last_status']) ? $state['last_status'] : 'idle'); ?>
						<?php $this->render_status_item(__('Last Cursor', 'javx-retrotube-sync'), isset($state['last_since']) ? $state['last_since'] : '-'); ?>
						<?php $this->render_status_item(__('Last Run', 'javx-retrotube-sync'), isset($state['last_run_at']) ? $state['last_run_at'] : '-'); ?>
						<?php $this->render_status_item(__('Last Mode', 'javx-retrotube-sync'), isset($state['last_mode']) ? $state['last_mode'] : '-'); ?>
					</div>

					<div class="javx-rt-state-block">
						<strong><?php esc_html_e('Last Error:', 'javx-retrotube-sync'); ?></strong>
						<span id="javx-rt-last-error"><?php echo ! empty($state['last_error']) ? esc_html($state['last_error']) : esc_html__('None', 'javx-retrotube-sync'); ?></span>
					</div>

					<?php $summary = isset($state['last_summary']) && is_array($state['last_summary']) ? $state['last_summary'] : array(); ?>
					<div class="javx-rt-summary-grid">
						<?php $this->render_status_item(__('Created', 'javx-retrotube-sync'), isset($summary['created']) ? $summary['created'] : 0); ?>
						<?php $this->render_status_item(__('Updated', 'javx-retrotube-sync'), isset($summary['updated']) ? $summary['updated'] : 0); ?>
						<?php $this->render_status_item(__('Skipped', 'javx-retrotube-sync'), isset($summary['skipped']) ? $summary['skipped'] : 0); ?>
						<?php $this->render_status_item(__('Failed', 'javx-retrotube-sync'), isset($summary['failed']) ? $summary['failed'] : 0); ?>
					</div>

					<div class="javx-rt-live-panel">
						<h3><?php esc_html_e('Live Status', 'javx-retrotube-sync'); ?></h3>
						<p id="javx-rt-live-message"><?php esc_html_e('Idle.', 'javx-retrotube-sync'); ?></p>
						<div id="javx-rt-inline-progress" class="javx-rt-progress">
							<div class="javx-rt-progress-bar" style="width: 0%;"></div>
						</div>
						<div class="javx-rt-inline-stats">
							<span id="javx-rt-progress-percent">0%</span>
							<span id="javx-rt-progress-count">0 / 0</span>
						</div>
						<div id="javx-rt-log-output" class="javx-rt-log-output"></div>
					</div>
				</div>
			</div>

			<div id="javx-rt-progress-modal" class="javx-rt-modal" aria-hidden="true">
				<div class="javx-rt-modal-dialog">
					<h2><?php esc_html_e('Full Import Progress', 'javx-retrotube-sync'); ?></h2>
					<p id="javx-rt-modal-message"><?php esc_html_e('Preparing import...', 'javx-retrotube-sync'); ?></p>
					<div class="javx-rt-progress">
						<div class="javx-rt-progress-bar" id="javx-rt-modal-progress-bar" style="width: <?php echo esc_attr($session_progress); ?>%;"></div>
					</div>
					<div class="javx-rt-modal-stats">
						<span id="javx-rt-modal-progress-percent"><?php echo esc_html($session_progress); ?>%</span>
						<span id="javx-rt-modal-progress-count"><?php echo isset($session['processed']) ? esc_html($session['processed']) : '0'; ?> / <?php echo isset($session['total']) ? esc_html($session['total']) : '0'; ?></span>
					</div>
					<div class="javx-rt-summary-grid">
						<?php $this->render_status_item(__('Created', 'javx-retrotube-sync'), isset($session['created']) ? $session['created'] : 0, 'javx-rt-created-count'); ?>
						<?php $this->render_status_item(__('Updated', 'javx-retrotube-sync'), isset($session['updated']) ? $session['updated'] : 0, 'javx-rt-updated-count'); ?>
						<?php $this->render_status_item(__('Skipped', 'javx-retrotube-sync'), isset($session['skipped']) ? $session['skipped'] : 0, 'javx-rt-skipped-count'); ?>
						<?php $this->render_status_item(__('Failed', 'javx-retrotube-sync'), isset($session['failed']) ? $session['failed'] : 0, 'javx-rt-failed-count'); ?>
					</div>
					<div id="javx-rt-modal-log-output" class="javx-rt-log-output"><?php echo ! empty($session['logs']) ? esc_html(implode("\n", $session['logs'])) : ''; ?></div>
					<div class="javx-rt-modal-actions">
						<button type="button" class="button button-secondary" id="javx-rt-close-modal"><?php esc_html_e('Close', 'javx-retrotube-sync'); ?></button>
					</div>
				</div>
			</div>
		</div>
		<?php
	}

	public function ajax_test_connection() {
		$this->verify_ajax_request();

		$response = $this->api_client->test_connection();
		if (is_wp_error($response)) {
			wp_send_json_error(array('message' => $response->get_error_message()), 400);
		}

		wp_send_json_success($response);
	}

	public function ajax_run_incremental_sync() {
		$this->verify_ajax_request();

		$result = $this->engine->run_incremental_sync(true);
		if (is_wp_error($result)) {
			wp_send_json_error(array('message' => $result->get_error_message()), 400);
		}

		wp_send_json_success($result);
	}

	public function ajax_start_full_import() {
		$this->verify_ajax_request();

		$connection = $this->api_client->test_connection();
		if (is_wp_error($connection)) {
			wp_send_json_error(array('message' => $connection->get_error_message()), 400);
		}

		wp_send_json_success($this->engine->start_full_import());
	}

	public function ajax_run_full_import_batch() {
		$this->verify_ajax_request();

		$result = $this->engine->run_full_import_batch();
		if (is_wp_error($result)) {
			$data = $result->get_error_data();
			wp_send_json_error(
				array(
					'message' => $result->get_error_message(),
					'session' => is_array($data) ? $data : array(),
				),
				400
			);
		}

		wp_send_json_success($result);
	}

	public function ajax_cancel_full_import() {
		$this->verify_ajax_request();
		wp_send_json_success($this->engine->cancel_full_import());
	}

	private function verify_ajax_request() {
		check_ajax_referer('javx_rt_sync_nonce', 'nonce');

		if (! current_user_can('manage_options')) {
			wp_send_json_error(array('message' => __('Forbidden.', 'javx-retrotube-sync')), 403);
		}
	}

	private function render_text_field($label, $name, $value, $placeholder = '') {
		?>
		<label class="javx-rt-field">
			<span><?php echo esc_html($label); ?></span>
			<input type="text" name="<?php echo esc_attr($name); ?>" value="<?php echo esc_attr($value); ?>" placeholder="<?php echo esc_attr($placeholder); ?>" class="regular-text" />
		</label>
		<?php
	}

	private function render_number_field($label, $name, $value, $min, $max) {
		?>
		<label class="javx-rt-field">
			<span><?php echo esc_html($label); ?></span>
			<input type="number" name="<?php echo esc_attr($name); ?>" value="<?php echo esc_attr($value); ?>" min="<?php echo esc_attr($min); ?>" max="<?php echo esc_attr($max); ?>" class="small-text" />
		</label>
		<?php
	}

	private function render_select_field($label, $name, $value, $options) {
		?>
		<label class="javx-rt-field">
			<span><?php echo esc_html($label); ?></span>
			<select name="<?php echo esc_attr($name); ?>">
				<?php foreach ($options as $option_value => $option_label) : ?>
					<option value="<?php echo esc_attr($option_value); ?>" <?php selected($value, $option_value); ?>>
						<?php echo esc_html($option_label); ?>
					</option>
				<?php endforeach; ?>
			</select>
		</label>
		<?php
	}

	private function render_checkbox_field($label, $name, $checked) {
		?>
		<label class="javx-rt-field javx-rt-checkbox">
			<input type="checkbox" name="<?php echo esc_attr($name); ?>" value="1" <?php checked($checked); ?> />
			<span><?php echo esc_html($label); ?></span>
		</label>
		<?php
	}

	private function render_status_item($label, $value, $value_id = '') {
		?>
		<div class="javx-rt-status-item">
			<span class="javx-rt-status-label"><?php echo esc_html($label); ?></span>
			<strong<?php echo $value_id ? ' id="' . esc_attr($value_id) . '"' : ''; ?>>
				<?php echo esc_html(is_scalar($value) ? (string) $value : wp_json_encode($value)); ?>
			</strong>
		</div>
		<?php
	}
}
