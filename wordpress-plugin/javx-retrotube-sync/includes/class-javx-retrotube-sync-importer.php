<?php

if (! defined('ABSPATH')) {
	exit;
}

class Javx_RetroTube_Sync_Importer {
	/**
	 * @var Javx_RetroTube_Sync_Plugin
	 */
	private $plugin;

	public function __construct($plugin) {
		$this->plugin = $plugin;
	}

	public function upsert_video($video) {
		$settings   = $this->plugin->get_settings();
		$source_id  = isset($video['id']) ? sanitize_text_field($video['id']) : '';
		$updated_at = isset($video['updated_at']) ? sanitize_text_field($video['updated_at']) : '';

		if (empty($source_id)) {
			return new WP_Error('javx_missing_source_id', __('Video payload is missing source id.', 'javx-retrotube-sync'));
		}

		$post_id = $this->find_post_by_source_id($source_id);

		if ($post_id && ! $this->should_update_post($post_id, $updated_at)) {
			return array(
				'action'  => 'skipped',
				'post_id' => $post_id,
				'message' => sprintf(__('Skipped %s because it is already up to date.', 'javx-retrotube-sync'), $source_id),
			);
		}

		$post_data = $this->build_post_data($video, $post_id);
		$result_id = $post_id ? wp_update_post($post_data, true) : wp_insert_post($post_data, true);

		if (is_wp_error($result_id)) {
			return $result_id;
		}

		$this->sync_taxonomies($result_id, $video, $settings);
		$warnings = $this->sync_featured_image($result_id, $video, $settings);
		$this->sync_meta($result_id, $video, $settings);
		$action   = $post_id ? 'updated' : 'created';
		$message  = sprintf(__('%1$s video %2$s', 'javx-retrotube-sync'), ucfirst($action), $source_id);

		if (! empty($warnings)) {
			$message .= ' - ' . implode('; ', $warnings);
		}

		return array(
			'action'   => $action,
			'post_id'  => $result_id,
			'message'  => $message,
			'warnings' => $warnings,
		);
	}

	private function find_post_by_source_id($source_id) {
		$meta_key = $this->plugin->get_settings()['source_id_meta_key'];
		$post_ids = get_posts(
			array(
				'post_type'      => 'any',
				'post_status'    => 'any',
				'fields'         => 'ids',
				'posts_per_page' => 1,
				'meta_key'       => $meta_key,
				'meta_value'     => $source_id,
				'no_found_rows'  => true,
			)
		);

		return empty($post_ids) ? 0 : (int) $post_ids[0];
	}

	private function should_update_post($post_id, $updated_at) {
		if (empty($updated_at)) {
			return true;
		}

		$meta_key      = $this->plugin->get_settings()['source_updated_meta_key'];
		$current_value = get_post_meta($post_id, $meta_key, true);

		if (empty($current_value)) {
			return true;
		}

		$current_ts = strtotime($current_value);
		$incoming_ts = strtotime($updated_at);

		if (! $current_ts || ! $incoming_ts) {
			return $current_value !== $updated_at;
		}

		return $incoming_ts > $current_ts;
	}

	private function build_post_data($video, $post_id) {
		$settings   = $this->plugin->get_settings();
		$created_at = isset($video['created_at']) ? gmdate('Y-m-d H:i:s', strtotime($video['created_at'])) : current_time('mysql', true);
		$post_title = isset($video['title']) ? wp_strip_all_tags($video['title']) : __('Untitled Video', 'javx-retrotube-sync');
		$post_slug  = isset($video['slug']) ? sanitize_title($video['slug']) : sanitize_title($post_title);
		$post_data  = array(
			'post_type'    => $settings['target_post_type'],
			'post_title'   => $post_title,
			'post_content' => isset($video['description']) ? wp_kses_post($video['description']) : '',
			'post_name'    => $post_slug,
			'post_date_gmt'=> $created_at,
			'post_status'  => $post_id ? get_post_status($post_id) : $settings['post_status'],
		);

		if (! $post_id) {
			$post_data['post_date'] = get_date_from_gmt($created_at);
		} else {
			$post_data['ID'] = $post_id;
		}

		return $post_data;
	}

	private function sync_taxonomies($post_id, $video, $settings) {
		$categories = isset($video['categories']) && is_array($video['categories']) ? $this->sanitize_term_names($video['categories']) : array();
		$tags       = isset($video['tags']) && is_array($video['tags']) ? $this->sanitize_term_names($video['tags']) : array();
		$pornstars  = isset($video['pornstars']) && is_array($video['pornstars']) ? $this->extract_pornstar_names($video['pornstars']) : array();

		if (! empty($settings['category_taxonomy']) && taxonomy_exists($settings['category_taxonomy'])) {
			wp_set_object_terms($post_id, $categories, $settings['category_taxonomy'], false);
		}

		if (! empty($settings['tag_taxonomy']) && taxonomy_exists($settings['tag_taxonomy'])) {
			wp_set_object_terms($post_id, $tags, $settings['tag_taxonomy'], false);
		}

		if (! empty($settings['pornstar_taxonomy']) && taxonomy_exists($settings['pornstar_taxonomy'])) {
			wp_set_object_terms($post_id, $pornstars, $settings['pornstar_taxonomy'], false);
		} elseif (! empty($settings['pornstar_meta_key'])) {
			update_post_meta($post_id, $settings['pornstar_meta_key'], wp_json_encode($pornstars));
		}
	}

	private function sync_meta($post_id, $video, $settings) {
		$playback_url = isset($video['playback_url']) ? esc_url_raw($video['playback_url']) : '';
		$embed_url    = isset($video['embed_url']) ? esc_url_raw($this->plugin->normalize_remote_url($video['embed_url'])) : '';
		$thumbnail    = isset($video['thumbnail_url']) ? esc_url_raw($video['thumbnail_url']) : '';
		$duration     = isset($video['duration']) ? absint($video['duration']) : 0;

		$meta_map = array(
			$settings['source_id_meta_key']       => isset($video['id']) ? sanitize_text_field($video['id']) : '',
			$settings['source_updated_meta_key']  => isset($video['updated_at']) ? sanitize_text_field($video['updated_at']) : '',
			$settings['source_slug_meta_key']     => isset($video['slug']) ? sanitize_title($video['slug']) : '',
			$settings['source_playback_meta_key'] => $playback_url,
			$settings['source_embed_meta_key']    => $embed_url,
			$settings['source_thumb_meta_key']    => $thumbnail,
		);

		if ('playback' === $settings['import_mode'] && ! empty($settings['playback_meta_key'])) {
			$meta_map[ $settings['playback_meta_key'] ] = $playback_url;
		}

		if ('embed' === $settings['import_mode'] && ! empty($settings['embed_meta_key'])) {
			$meta_map[ $settings['embed_meta_key'] ] = $embed_url;
		}

		if (! empty($settings['duration_meta_key'])) {
			$meta_map[ $settings['duration_meta_key'] ] = $duration;
		}

		if (! empty($settings['thumbnail_meta_key'])) {
			$meta_map[ $settings['thumbnail_meta_key'] ] = $thumbnail;
		}

		foreach ($meta_map as $meta_key => $meta_value) {
			if (empty($meta_key)) {
				continue;
			}

			update_post_meta($post_id, $meta_key, $meta_value);
		}
	}

	private function sync_featured_image($post_id, $video, $settings) {
		$warnings = array();

		if (empty($settings['import_featured_image']) || empty($video['thumbnail_url'])) {
			return $warnings;
		}

		$thumbnail_url = esc_url_raw($video['thumbnail_url']);
		if (empty($thumbnail_url)) {
			return $warnings;
		}

		$current_source = get_post_meta($post_id, $settings['source_thumb_meta_key'], true);
		$has_thumbnail  = has_post_thumbnail($post_id);

		if ($has_thumbnail && $current_source === $thumbnail_url) {
			return $warnings;
		}

		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$attachment_id = media_sideload_image($thumbnail_url, $post_id, null, 'id');
		if (is_wp_error($attachment_id)) {
			$warnings[] = $attachment_id->get_error_message();
			return $warnings;
		}

		set_post_thumbnail($post_id, (int) $attachment_id);
		return $warnings;
	}

	private function sanitize_term_names($terms) {
		$values = array();
		foreach ($terms as $term_name) {
			$sanitized = wp_strip_all_tags((string) $term_name);
			if ('' !== $sanitized) {
				$values[] = $sanitized;
			}
		}

		return array_values(array_unique($values));
	}

	private function extract_pornstar_names($pornstars) {
		$names = array();
		foreach ($pornstars as $pornstar) {
			if (is_array($pornstar) && ! empty($pornstar['name'])) {
				$names[] = $pornstar['name'];
			} elseif (is_string($pornstar)) {
				$names[] = $pornstar;
			}
		}

		return $this->sanitize_term_names($names);
	}
}
