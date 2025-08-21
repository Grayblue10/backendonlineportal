/**
 * Attendance Status Constants
 * These constants define the possible attendance statuses that can be assigned to a student
 */

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
  TARDY: 'tardy',
  LEFT_EARLY: 'left_early',
  SCHOOL_ABSENCE: 'school_absence',
  FIELD_TRIP: 'field_trip',
  SUSPENDED: 'suspended',
  OTHER: 'other'
};

/**
 * Attendance Types
 * Defines the types of attendance records
 */
export const ATTENDANCE_TYPES = {
  DAILY: 'daily',
  PERIOD: 'period',
  SESSION: 'session',
  EVENT: 'event'
};

/**
 * Attendance Sync Status
 * Tracks the synchronization status of attendance records
 */
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed'
};

/**
 * Default Pagination Settings
 */
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
  SORT_BY: '-date',
  SORT_ORDER: 'desc'
};

/**
 * Attendance Export Formats
 */
export const EXPORT_FORMATS = {
  CSV: 'csv',
  EXCEL: 'excel',
  PDF: 'pdf'
};

/**
 * Attendance Validation Rules
 */
export const VALIDATION_RULES = {
  NOTES_MAX_LENGTH: 500,
  EXCUSE_NOTES_MAX_LENGTH: 500,
  LATE_MINUTES_MAX: 1440 // 24 hours in minutes
};
