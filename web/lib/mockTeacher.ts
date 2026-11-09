/**
 * Teacher session helpers.
 * Auth is handled by Firebase (same email/password flow as admin).
 * The session key is used to cache the teacher profile in sessionStorage
 * so the teacher page can access it without an extra Firebase read on every
 * navigation.
 */
export const TEACHER_SESSION_KEY = "teacherSession";
