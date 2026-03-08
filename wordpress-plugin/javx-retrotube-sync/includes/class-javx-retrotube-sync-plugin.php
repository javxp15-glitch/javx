<?php

if (! defined('ABSPATH')) {
	exit;
}

class Javx_RetroTube_Sync_Plugin {
	const SETTINGS_OPTION = 'javx_rt_sync_settings';
	const STATE_OPTION    = 'javx_rt_sync_state';
	const SESSION_OPTION  = 'javx_rt_sync_session';
	const LOCK_TRANSIENT  = 'javx_rt_sync_lock';
	const CRON_HOOK       = 'javx_rt_sync_event';

	/**
	 * @var self|null
	 */
	private static $instance = null;

	/**
	 * @var Javx_RetroTube_Sync_API_Client
	 */
	private $api_client;

	/**
	 * @var Javx_RetroTube_Sync_Importer
	 */
	private $importer;

	/**
	 * @var Javx_RetroTube_Sync_Engine
	 */
	private $engine;

	/**
	 * @var Javx_RetroTube_Sync_Admin
	 */
	private $admin;

	public static function instance() {
		if (null === self::$instance) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		$this->api_client = new Javx_RetroTube_Sync_API_Client($this);
		$this->importer   = new Javx_RetroTube_Sync_Importer($this);
		$this->engine     = new Javx_RetroTube_Sync_Engine($this, $this->api_client, $this->importer);
		$this->admin      = new Javx_RetroTube_Sync_Admin($this, $this->api_client, $this->engine);

		add_filter('cron_schedules', array($this, 'register_cron_schedules'));
		add_action('init', array($this, 'register_runtime_components'), 20);
		add_action('init', array($this, 'ensure_cron_schedule'), 30);
		add_action(self::CRON_HOOK, array($this->engine, 'run_incremental_sync'));
	}

	public static function activate() {
		$plugin = self::instance();
		add_option(self::SETTINGS_OPTION, $plugin->get_default_settings());
		add_option(self::STATE_OPTION, $plugin->get_default_state());
		$plugin->ensure_cron_schedule();
	}

	public static function deactivate() {
		wp_clear_scheduled_hook(self::CRON_HOOK);
		delete_transient(self::LOCK_TRANSIENT);
	}

	public function register_runtime_components() {
		$settings = $this->get_settings();
		$taxonomy = $settings['pornstar_taxonomy'];
		$post_type = $settings['target_post_type'];

		if (! empty($taxonomy) && taxonomy_exists($taxonomy)) {
			register_taxonomy_for_object_type($taxonomy, $post_type);
			return;
		}

		if (empty($settings['create_pornstar_taxonomy']) || empty($taxonomy)) {
			return;
		}

		register_taxonomy(
			$taxonomy,
			array($post_type),
			array(
				'hierarchical'      => false,
				'labels'            => array(
					'name'          => __('Pornstars', 'javx-retrotube-sync'),
					'singular_name' => __('Pornstar', 'javx-retrotube-sync'),
				),
				'show_ui'           => true,
				'show_admin_column' => true,
				'rewrite'           => array(
					'slug' => $taxonomy,
				),
				'show_in_rest'      => true,
			)
		);
	}

	public function register_cron_schedules($schedules) {
		$schedules['javx_rt_5_minutes'] = array(
			'interval' => 5 * MINUTE_IN_SECONDS,
			'display'  => __('Every 5 minutes', 'javx-retrotube-sync'),
		);
		$schedules['javx_rt_10_minutes'] = array(
			'interval' => 10 * MINUTE_IN_SECONDS,
			'display'  => __('Every 10 minutes', 'javx-retrotube-sync'),
		);
		$schedules['javx_rt_15_minutes'] = array(
			'interval' => 15 * MINUTE_IN_SECONDS,
			'display'  => __('Every 15 minutes', 'javx-retrotube-sync'),
		);
		$schedules['javx_rt_30_minutes'] = array(
			'interval' => 30 * MINUTE_IN_SECONDS,
			'display'  => __('Every 30 minutes', 'javx-retrotube-sync'),
		);

		return $schedules;
	}

	public function ensure_cron_schedule() {
		$settings         = $this->get_settings();
		$selected_schedule = $this->map_sync_interval_to_schedule($settings['sync_interval']);
		$next_timestamp    = wp_next_scheduled(self::CRON_HOOK);
		$current_schedule  = $next_timestamp ? wp_get_schedule(self::CRON_HOOK) : false;

		if ($next_timestamp && $current_schedule === $selected_schedule) {
			return;
		}

		if ($next_timestamp) {
			wp_clear_scheduled_hook(self::CRON_HOOK);
		}

		wp_schedule_event(time() + MINUTE_IN_SECONDS, $selected_schedule, self::CRON_HOOK);
	}

	public function map_sync_interval_to_schedule($sync_interval) {
		$map = array(
			'5m'  => 'javx_rt_5_minutes',
			'10m' => 'javx_rt_10_minutes',
			'15m' => 'javx_rt_15_minutes',
			'30m' => 'javx_rt_30_minutes',
			'1h'  => 'hourly',
		);

		return isset($map[ $sync_interval ]) ? $map[ $sync_interval ] : 'javx_rt_10_minutes';
	}

	public function get_default_settings() {
		return array(
			'api_base_url'             => '',
			'api_token'                => '',
			'batch_size'               => 20,
			'sync_interval'            => '10m',
			'import_mode'              => 'playback',
			'target_post_type'         => 'post',
			'post_status'              => 'publish',
			'category_taxonomy'        => 'category',
			'tag_taxonomy'             => 'post_tag',
			'pornstar_taxonomy'        => 'pornstar',
			'create_pornstar_taxonomy' => 1,
			'import_featured_image'    => 1,
			'playback_meta_key'        => 'video_url',
			'embed_meta_key'           => 'embed_url',
			'duration_meta_key'        => 'duration',
			'thumbnail_meta_key'       => '',
			'source_id_meta_key'       => '_javx_source_video_id',
			'source_updated_meta_key'  => '_javx_source_updated_at',
			'source_slug_meta_key'     => '_javx_source_slug',
			'source_playback_meta_key' => '_javx_source_playback_url',
			'source_embed_meta_key'    => '_javx_source_embed_url',
			'source_thumb_meta_key'    => '_javx_source_thumbnail_url',
			'pornstar_meta_key'        => '_javx_source_pornstars',
		);
	}

	public function get_default_state() {
		return array(
			'last_since'       => '',
			'last_status'      => 'idle',
			'last_error'       => '',
			'last_summary'     => array(),
			'last_run_at'      => '',
			'last_mode'        => '',
			'updated_at'       => current_time('mysql', true),
			'last_connection'  => array(),
		);
	}

	public function get_default_session() {
		return array(
			'running'        => false,
			'canceled'       => false,
			'completed'      => false,
			'page'           => 1,
			'per_page'       => (int) $this->get_settings()['batch_size'],
			'processed'      => 0,
			'total'          => 0,
			'total_pages'    => 0,
			'created'        => 0,
			'updated'        => 0,
			'skipped'        => 0,
			'failed'         => 0,
			'max_updated_at' => '',
			'logs'           => array(),
			'started_at'     => '',
			'finished_at'    => '',
			'last_error'     => '',
		);
	}

	public function get_settings() {
		return wp_parse_args(get_option(self::SETTINGS_OPTION, array()), $this->get_default_settings());
	}

	public function sanitize_settings($input) {
		$defaults = $this->get_default_settings();

		$settings = array(
			'api_base_url'             => esc_url_raw(untrailingslashit(isset($input['api_base_url']) ? $input['api_base_url'] : '')),
			'api_token'                => sanitize_text_field(isset($input['api_token']) ? $input['api_token'] : ''),
			'batch_size'               => $this->clamp_integer(isset($input['batch_size']) ? $input['batch_size'] : $defaults['batch_size'], 1, 20, 50),
			'sync_interval'            => in_array(isset($input['sync_interval']) ? $input['sync_interval'] : '', array('5m', '10m', '15m', '30m', '1h'), true) ? $input['sync_interval'] : $defaults['sync_interval'],
			'import_mode'              => in_array(isset($input['import_mode']) ? $input['import_mode'] : '', array('playback', 'embed'), true) ? $input['import_mode'] : $defaults['import_mode'],
			'target_post_type'         => sanitize_key(isset($input['target_post_type']) ? $input['target_post_type'] : $defaults['target_post_type']),
			'post_status'              => in_array(isset($input['post_status']) ? $input['post_status'] : '', array('publish', 'draft', 'pending', 'private'), true) ? $input['post_status'] : $defaults['post_status'],
			'category_taxonomy'        => sanitize_key(isset($input['category_taxonomy']) ? $input['category_taxonomy'] : $defaults['category_taxonomy']),
			'tag_taxonomy'             => sanitize_key(isset($input['tag_taxonomy']) ? $input['tag_taxonomy'] : $defaults['tag_taxonomy']),
			'pornstar_taxonomy'        => sanitize_key(isset($input['pornstar_taxonomy']) ? $input['pornstar_taxonomy'] : $defaults['pornstar_taxonomy']),
			'create_pornstar_taxonomy' => empty($input['create_pornstar_taxonomy']) ? 0 : 1,
			'import_featured_image'    => empty($input['import_featured_image']) ? 0 : 1,
			'playback_meta_key'        => sanitize_key(isset($input['playback_meta_key']) ? $input['playback_meta_key'] : $defaults['playback_meta_key']),
			'embed_meta_key'           => sanitize_key(isset($input['embed_meta_key']) ? $input['embed_meta_key'] : $defaults['embed_meta_key']),
			'duration_meta_key'        => sanitize_key(isset($input['duration_meta_key']) ? $input['duration_meta_key'] : $defaults['duration_meta_key']),
			'thumbnail_meta_key'       => sanitize_key(isset($input['thumbnail_meta_key']) ? $input['thumbnail_meta_key'] : $defaults['thumbnail_meta_key']),
			'source_id_meta_key'       => sanitize_key(isset($input['source_id_meta_key']) ? $input['source_id_meta_key'] : $defaults['source_id_meta_key']),
			'source_updated_meta_key'  => sanitize_key(isset($input['source_updated_meta_key']) ? $input['source_updated_meta_key'] : $defaults['source_updated_meta_key']),
			'source_slug_meta_key'     => sanitize_key(isset($input['source_slug_meta_key']) ? $input['source_slug_meta_key'] : $defaults['source_slug_meta_key']),
			'source_playback_meta_key' => sanitize_key(isset($input['source_playback_meta_key']) ? $input['source_playback_meta_key'] : $defaults['source_playback_meta_key']),
			'source_embed_meta_key'    => sanitize_key(isset($input['source_embed_meta_key']) ? $input['source_embed_meta_key'] : $defaults['source_embed_meta_key']),
			'source_thumb_meta_key'    => sanitize_key(isset($input['source_thumb_meta_key']) ? $input['source_thumb_meta_key'] : $defaults['source_thumb_meta_key']),
			'pornstar_meta_key'        => sanitize_key(isset($input['pornstar_meta_key']) ? $input['pornstar_meta_key'] : $defaults['pornstar_meta_key']),
		);

		if (empty($settings['target_post_type'])) {
			$settings['target_post_type'] = 'post';
		}

		foreach (array(
			'source_id_meta_key',
			'source_updated_meta_key',
			'source_slug_meta_key',
			'source_playback_meta_key',
			'source_embed_meta_key',
			'source_thumb_meta_key',
			'pornstar_meta_key',
		) as $required_key) {
			if (empty($settings[ $required_key ])) {
				$settings[ $required_key ] = $defaults[ $required_key ];
			}
		}

		return $settings;
	}

	public function save_settings($settings) {
		update_option(self::SETTINGS_OPTION, $settings, false);
		$this->ensure_cron_schedule();
	}

	public function get_state() {
		return wp_parse_args(get_option(self::STATE_OPTION, array()), $this->get_default_state());
	}

	public function update_state($changes) {
		$state = array_merge($this->get_state(), $changes);
		$state['updated_at'] = current_time('mysql', true);
		update_option(self::STATE_OPTION, $state, false);
		return $state;
	}

	public function get_session() {
		return wp_parse_args(get_option(self::SESSION_OPTION, array()), $this->get_default_session());
	}

	public function update_session($changes) {
		$session = array_merge($this->get_session(), $changes);
		update_option(self::SESSION_OPTION, $session, false);
		return $session;
	}

	public function clear_session() {
		delete_option(self::SESSION_OPTION);
	}

	public function acquire_lock($ttl = 300) {
		$lock = get_transient(self::LOCK_TRANSIENT);
		if (! empty($lock)) {
			return false;
		}

		set_transient(
			self::LOCK_TRANSIENT,
			array(
				'acquired_at' => time(),
				'expires_in'  => (int) $ttl,
			),
			(int) $ttl
		);

		return true;
	}

	public function release_lock() {
		delete_transient(self::LOCK_TRANSIENT);
	}

	public function has_active_full_import() {
		$session = $this->get_session();
		return ! empty($session['running']);
	}

	public function get_api_client() {
		return $this->api_client;
	}

	public function get_importer() {
		return $this->importer;
	}

	public function get_engine() {
		return $this->engine;
	}

	public function normalize_remote_url($url) {
		if (empty($url)) {
			return '';
		}

		if (preg_match('#^https?://#i', $url)) {
			return $url;
		}

		$base_url = $this->get_settings()['api_base_url'];
		if (empty($base_url)) {
			return $url;
		}

		return trailingslashit(untrailingslashit($base_url)) . ltrim($url, '/');
	}

	private function clamp_integer($value, $fallback, $min, $max) {
		$numeric = absint($value);
		if (empty($numeric)) {
			$numeric = (int) $fallback;
		}

		if ($numeric < $min) {
			$numeric = $min;
		}

		if ($numeric > $max) {
			$numeric = $max;
		}

		return $numeric;
	}
}
