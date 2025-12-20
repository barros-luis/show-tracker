import { invoke } from "@tauri-apps/api/core";
import { SupabaseClient } from "@supabase/supabase-js";
import { getTVDetails, getMovieDetails, searchMovies, type TMDBTVShow } from "./tmdb";
import { getAnimeDetails, getAnimeRelations, type Anime } from "./jikan";

export interface AppNotification {
    id: number;
    user_id: string;
    watchlist_id: number;
    title: string;
    message: string;
    media_type: 'anime' | 'movie' | 'tv';
    image_url: string | null;
    read: boolean;
    created_at: string;
}

interface WatchlistItem {
    id: number;
    mal_id: number | null;
    tmdb_id: number | null;
    media_type: 'anime' | 'movie' | 'tv';
    title: string;
    image_url: string;
    total_episodes: number | null;
    seasons_count: number | null; // For TV shows - how many seasons when added
    last_episode_season: number | null; // For TV shows - last episode season when added
    last_episode_number: number | null; // For TV shows - last episode number when added
}

// Check if a date is within last N days (for sequels)
function isRecentlyStarted(dateStr: string, days: number): boolean {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= days;
}

// Check if a movie released within last N days
function isRecentlyReleased(dateStr: string, days: number): boolean {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= days;
}

// Check for new episodes/content for all watchlist items
export async function checkForNewReleases(
    supabase: SupabaseClient,
    userId: string,
    watchlist: WatchlistItem[],
    settings: { notifyInApp: boolean; notifyOS: boolean }
): Promise<AppNotification[]> {
    const newNotifications: AppNotification[] = [];

    for (const item of watchlist) {
        try {
            let hasNewContent = false;
            let newContentMessage = '';

            if (item.media_type === 'tv' && item.tmdb_id) {
                // Check TV show for new episodes and new seasons
                const details = await getTVDetails(item.tmdb_id);
                if (details) {
                    // Check for new episodes by comparing stored vs current last episode
                    const epResult = checkTVNewEpisode(details, item.last_episode_season, item.last_episode_number);
                    if (epResult.hasNew) {
                        hasNewContent = true;
                        newContentMessage = `New episode of ${item.title}! ${epResult.episodeInfo}`;
                    }

                    // Check for new seasons (if we have seasons_count stored)
                    if (!hasNewContent && item.seasons_count && details.number_of_seasons) {
                        if (details.number_of_seasons > item.seasons_count) {
                            hasNewContent = true;
                            newContentMessage = `New season of ${item.title}! Season ${details.number_of_seasons} now available`;
                        }
                    }

                    // Check for related movies (search for movies with same title)
                    if (!hasNewContent) {
                        const relatedMovies = await searchMovies(item.title, false);
                        for (const movie of relatedMovies.slice(0, 5)) {
                            // Check if titles are similar and movie released recently
                            const movieTitle = movie.title.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const showTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (movieTitle.includes(showTitle) || showTitle.includes(movieTitle)) {
                                if (movie.release_date && isRecentlyReleased(movie.release_date, 30)) {
                                    hasNewContent = true;
                                    newContentMessage = `New movie related to ${item.title}! "${movie.title}" is now available`;
                                    break;
                                }
                            }
                        }
                    }
                }
            } else if (item.media_type === 'anime' && item.mal_id) {
                // Check anime for new episodes
                const details = await getAnimeDetails(item.mal_id);
                if (details) {
                    const result = checkAnimeNewEpisode(details, item.total_episodes);
                    if (result.hasNew) {
                        hasNewContent = true;
                        newContentMessage = `New episode of ${item.title}! ${result.episodeInfo}`;
                    }
                }

                // Check for new sequels/seasons using relations API
                if (!hasNewContent) {
                    const relations = await getAnimeRelations(item.mal_id);
                    for (const rel of relations) {
                        // Only check for sequels and side stories
                        if (rel.relation === 'Sequel' || rel.relation === 'Side Story') {
                            for (const entry of rel.entries) {
                                if (entry.type === 'anime') {
                                    // Check if this sequel is new (currently airing and started recently)
                                    const sequelDetails = await getAnimeDetails(entry.mal_id);
                                    if (sequelDetails?.status === 'Currently Airing' && sequelDetails.aired?.from) {
                                        // Check if it started airing within last 30 days
                                        if (isRecentlyStarted(sequelDetails.aired.from, 30)) {
                                            hasNewContent = true;
                                            newContentMessage = `New ${rel.relation.toLowerCase()} for ${item.title}! "${entry.name}" is now airing`;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (hasNewContent) break;
                        }
                    }
                }

                // Rate limit for relations API
                await new Promise(resolve => setTimeout(resolve, 350));
            } else if (item.media_type === 'movie' && item.tmdb_id) {
                // Check if movie released recently
                const details = await getMovieDetails(item.tmdb_id);
                if (details?.release_date) {
                    if (isRecentlyReleased(details.release_date, 7)) {
                        hasNewContent = true;
                        newContentMessage = `${item.title} is now available!`;
                    }
                }
            }

            if (hasNewContent) {
                // Check if we already have this notification (avoid duplicates, including dismissed ones)
                const { data: existing } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('watchlist_id', item.id)
                    .eq('message', newContentMessage)
                    .maybeSingle();

                if (!existing) {
                    // Create notification in database
                    if (settings.notifyInApp) {
                        const { data: newNotif } = await supabase
                            .from('notifications')
                            .insert({
                                user_id: userId,
                                watchlist_id: item.id,
                                title: item.title,
                                message: newContentMessage,
                                media_type: item.media_type,
                                image_url: item.image_url,
                            })
                            .select()
                            .single();

                        if (newNotif) {
                            newNotifications.push(newNotif);
                        }
                    }

                    // Send OS notification
                    if (settings.notifyOS) {
                        try {
                            await invoke('send_os_notification', {
                                title: 'AShowTracker',
                                body: newContentMessage,
                            });
                        } catch (err) {
                            console.log('OS notification failed:', err);
                        }
                    }
                }
            }

            // Small delay to avoid hammering APIs
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
            console.error(`Error checking ${item.title}:`, err);
        }
    }

    return newNotifications;
}

// Check if TV show has new episodes (by comparing stored vs current last episode)
function checkTVNewEpisode(
    show: TMDBTVShow,
    storedSeason: number | null,
    storedEpisode: number | null
): { hasNew: boolean; episodeInfo: string } {
    const lastEp = show.last_episode_to_air;

    // No last episode info available
    if (!lastEp) return { hasNew: false, episodeInfo: '' };

    // No stored episode info - can't compare, skip (only affects old entries)
    if (storedSeason === null || storedEpisode === null) {
        return { hasNew: false, episodeInfo: '' };
    }

    // Compare: new if current season > stored OR (same season AND current episode > stored)
    const currentSeason = lastEp.season_number;
    const currentEpisode = lastEp.episode_number;

    const hasNewEpisodes =
        currentSeason > storedSeason ||
        (currentSeason === storedSeason && currentEpisode > storedEpisode);

    if (hasNewEpisodes) {
        // Calculate how many new episodes
        let newEpCount = 0;
        if (currentSeason === storedSeason) {
            newEpCount = currentEpisode - storedEpisode;
        } else {
            // Different season - just show latest
            newEpCount = 1;
        }

        const info = newEpCount > 1
            ? `${newEpCount} new episodes (up to S${currentSeason}E${currentEpisode})`
            : `S${currentSeason}E${currentEpisode}`;

        return { hasNew: true, episodeInfo: info };
    }

    return { hasNew: false, episodeInfo: '' };
}

// Check if anime has new episodes (by comparing tracked vs current episode count)
function checkAnimeNewEpisode(anime: Anime, trackedEpisodes: number | null): { hasNew: boolean; episodeInfo: string } {
    // Compare the known episode count with what we have tracked
    if (anime.episodes && anime.episodes > (trackedEpisodes || 0)) {
        return {
            hasNew: true,
            episodeInfo: `Episode ${anime.episodes}`
        };
    }
    return { hasNew: false, episodeInfo: '' };
}

// Fetch user's notifications
export async function fetchNotifications(
    supabase: SupabaseClient,
    userId: string
): Promise<AppNotification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .or('dismissed.is.null,dismissed.eq.false')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data || [];
}

// Mark notification as read
export async function markNotificationRead(
    supabase: SupabaseClient,
    notificationId: number
): Promise<void> {
    await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
}

// Mark all notifications as read
export async function markAllNotificationsRead(
    supabase: SupabaseClient,
    userId: string
): Promise<void> {
    await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);
}

// Clear all notifications (soft delete - mark as dismissed)
export async function clearAllNotifications(
    supabase: SupabaseClient,
    userId: string
): Promise<void> {
    await supabase
        .from('notifications')
        .update({ dismissed: true })
        .eq('user_id', userId);
}
