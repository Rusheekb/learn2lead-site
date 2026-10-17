-- Create enums for preference types
CREATE TYPE public.learning_pace AS ENUM ('slow', 'moderate', 'fast');
CREATE TYPE public.teaching_style AS ENUM ('visual', 'verbal', 'hands_on', 'mixed');
CREATE TYPE public.session_structure AS ENUM ('structured', 'flexible', 'mixed');
CREATE TYPE public.student_goal AS ENUM ('catch_up', 'maintain', 'get_ahead', 'test_prep');
CREATE TYPE public.communication_style AS ENUM ('encouraging', 'direct', 'balanced');
CREATE TYPE public.tutor_specialty AS ENUM ('struggling', 'maintaining', 'advanced', 'all');

-- Add preference columns to students table
ALTER TABLE public.students
ADD COLUMN learning_pace public.learning_pace,
ADD COLUMN teaching_style_pref public.teaching_style,
ADD COLUMN session_structure_pref public.session_structure,
ADD COLUMN primary_goal public.student_goal,
ADD COLUMN availability_windows text[] DEFAULT '{}',
ADD COLUMN communication_pref public.communication_style;

-- Add preference columns to tutors table
ALTER TABLE public.tutors
ADD COLUMN teaching_style_strength public.teaching_style,
ADD COLUMN preferred_pace public.learning_pace,
ADD COLUMN pace_flexibility boolean DEFAULT true,
ADD COLUMN session_structure public.session_structure,
ADD COLUMN specialty_focus public.tutor_specialty,
ADD COLUMN availability_windows text[] DEFAULT '{}',
ADD COLUMN grade_level_comfort text[] DEFAULT '{}';