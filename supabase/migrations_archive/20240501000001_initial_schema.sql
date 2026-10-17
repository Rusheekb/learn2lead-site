
-- Initial schema setup for the Learn2Lead application

-- This is a reference for the initial schema, which has already been applied
-- This migration file is included for documentation purposes

-- Create app_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('student', 'tutor', 'admin');
    END IF;
END$$;

-- Ensure tables exist (these have likely been created already)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    grade TEXT,
    subjects TEXT[] NOT NULL DEFAULT '{}',
    payment_status TEXT NOT NULL DEFAULT 'paid',
    active BOOLEAN NOT NULL DEFAULT true,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tutors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subjects TEXT[] DEFAULT '{}',
    hourly_rate NUMERIC,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tutor_student_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES public.tutors(id),
    student_id UUID NOT NULL REFERENCES public.students(id),
    subject TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Date" DATE,
    "Day" TEXT,
    "Time (CST)" TEXT,
    "Time (hrs)" TEXT,
    "Student Name" TEXT DEFAULT '',
    "Tutor Name" TEXT DEFAULT '',
    "Subject" TEXT,
    "HW" TEXT,
    "Content" TEXT,
    "Additional Info" TEXT,
    "Class ID" TEXT,
    "Class Number" TEXT,
    "Class Cost" TEXT,
    "Tutor Cost" TEXT,
    "Student Payment" TEXT,
    "Tutor Payment" TEXT
);

CREATE TABLE IF NOT EXISTS public.scheduled_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    tutor_id UUID NOT NULL REFERENCES public.tutors(id),
    student_id UUID NOT NULL REFERENCES public.students(id),
    relationship_id UUID REFERENCES public.tutor_student_relationships(id),
    subject TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    zoom_link TEXT,
    notes TEXT,
    attendance TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    file_path TEXT,
    content_type TEXT,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    viewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.class_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.class_logs(id),
    message TEXT NOT NULL,
    student_name TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.class_logs(id),
    student_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size TEXT NOT NULL,
    note TEXT,
    upload_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

