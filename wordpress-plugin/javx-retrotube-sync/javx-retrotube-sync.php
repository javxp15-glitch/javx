<?php
/**
 * Plugin Name: JAVX RetroTube Sync
 * Plugin URI: https://example.com/javx-retrotube-sync
 * Description: Sync videos from the JAVX API into WordPress and RetroTube in batches with progress tracking.
 * Version: 1.0.0
 * Author: OpenAI Codex
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Text Domain: javx-retrotube-sync
 */

if (! defined('ABSPATH')) {
	exit;
}

define('JAVX_RT_SYNC_VERSION', '1.0.0');
define('JAVX_RT_SYNC_FILE', __FILE__);
define('JAVX_RT_SYNC_DIR', plugin_dir_path(__FILE__));
define('JAVX_RT_SYNC_URL', plugin_dir_url(__FILE__));
define('JAVX_RT_SYNC_BASENAME', plugin_basename(__FILE__));

require_once JAVX_RT_SYNC_DIR . 'includes/class-javx-retrotube-sync-plugin.php';
require_once JAVX_RT_SYNC_DIR . 'includes/class-javx-retrotube-sync-api-client.php';
require_once JAVX_RT_SYNC_DIR . 'includes/class-javx-retrotube-sync-importer.php';
require_once JAVX_RT_SYNC_DIR . 'includes/class-javx-retrotube-sync-engine.php';
require_once JAVX_RT_SYNC_DIR . 'includes/class-javx-retrotube-sync-admin.php';

register_activation_hook(JAVX_RT_SYNC_FILE, array('Javx_RetroTube_Sync_Plugin', 'activate'));
register_deactivation_hook(JAVX_RT_SYNC_FILE, array('Javx_RetroTube_Sync_Plugin', 'deactivate'));

function javx_retrotube_sync() {
	return Javx_RetroTube_Sync_Plugin::instance();
}

javx_retrotube_sync();
