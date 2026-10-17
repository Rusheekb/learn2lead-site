-- Remove unnecessary tables that aren't being used

-- Drop audit and security tables that are excessive for this application
DROP TABLE IF EXISTS access_audit_log CASCADE;
DROP TABLE IF EXISTS admin_action_log CASCADE;
DROP TABLE IF EXISTS role_change_audit CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS file_validation_logs CASCADE;

-- Drop backup logs table if not actively used
DROP TABLE IF EXISTS backup_logs CASCADE;

-- Drop views that are redundant (student_classes and tutor_students are views of existing data)
DROP VIEW IF EXISTS student_classes CASCADE;
DROP VIEW IF EXISTS tutor_students CASCADE;

-- Drop class_messages table if messaging functionality is disabled
DROP TABLE IF EXISTS class_messages CASCADE;