/**
 * Announcement Types
 * Defines the different types of announcements that can be created
 */
export const ANNOUNCEMENT_TYPES = {
  GENERAL: 'general',
  ACADEMIC: 'academic',
  EVENT: 'event',
  HOLIDAY: 'holiday',
  URGENT: 'urgent',
  REMINDER: 'reminder',
  ACHIEVEMENT: 'achievement',
  NOTICE: 'notice',
  UPDATE: 'update',
  OTHER: 'other'
};

/**
 * Announcement Targets
 * Defines who can see the announcement
 */
export const ANNOUNCEMENT_TARGETS = {
  ALL: 'all',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  PARENTS: 'parents',
  SPECIFIC: 'specific', // For specific classes, grades, or individuals
  ADMIN: 'admin',
  STAFF: 'staff'
};

/**
 * Announcement Status
 * Defines the possible statuses of an announcement
 */
export const ANNOUNCEMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  SCHEDULED: 'scheduled'
};

/**
 * Priority Levels
 * Defines the priority levels for announcements
 */
export const PRIORITY_LEVELS = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 5
};

/**
 * Default Pagination Settings for Announcements
 */
export const ANNOUNCEMENT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
  SORT_BY: '-createdAt',
  SORT_ORDER: 'desc'
};

/**
 * Announcement Validation Rules
 */
export const VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 200,
  CONTENT_MIN_LENGTH: 10,
  ATTACHMENTS_MAX_COUNT: 5,
  ATTACHMENT_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
};

/**
 * Announcement Cache Settings
 */
export const CACHE_SETTINGS = {
  TTL: 300, // 5 minutes in seconds
  PREFIX: 'announcement_',
  VERSION: '1.0'
};
