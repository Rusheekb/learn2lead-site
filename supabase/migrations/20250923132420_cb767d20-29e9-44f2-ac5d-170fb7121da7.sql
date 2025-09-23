-- Step 1: Drop existing foreign key constraints that point to tutors/students tables
ALTER TABLE public.scheduled_classes 
DROP CONSTRAINT IF EXISTS scheduled_classes_tutor_id_fkey;

ALTER TABLE public.scheduled_classes 
DROP CONSTRAINT IF EXISTS scheduled_classes_student_id_fkey;

-- Step 2: Create new foreign key constraints pointing to profiles table
ALTER TABLE public.scheduled_classes 
ADD CONSTRAINT scheduled_classes_tutor_id_fkey 
FOREIGN KEY (tutor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.scheduled_classes 
ADD CONSTRAINT scheduled_classes_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 3: Update any existing scheduled_classes records to use profile IDs
-- This ensures data consistency by mapping tutor emails to profile IDs
UPDATE public.scheduled_classes 
SET tutor_id = (
  SELECT p.id 
  FROM public.profiles p 
  JOIN public.tutors t ON t.email = p.email 
  WHERE t.id = scheduled_classes.tutor_id
)
WHERE tutor_id IN (SELECT id FROM public.tutors);

-- Map student emails to profile IDs  
UPDATE public.scheduled_classes 
SET student_id = (
  SELECT p.id 
  FROM public.profiles p 
  JOIN public.students s ON s.email = p.email 
  WHERE s.id = scheduled_classes.student_id
)
WHERE student_id IN (SELECT id FROM public.students);

-- Step 4: Update tutor_student_assigned table constraints for consistency
ALTER TABLE public.tutor_student_assigned 
DROP CONSTRAINT IF EXISTS tutor_student_assigned_tutor_id_fkey;

ALTER TABLE public.tutor_student_assigned 
DROP CONSTRAINT IF EXISTS tutor_student_assigned_student_id_fkey;

ALTER TABLE public.tutor_student_assigned 
ADD CONSTRAINT tutor_student_assigned_tutor_id_fkey 
FOREIGN KEY (tutor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tutor_student_assigned 
ADD CONSTRAINT tutor_student_assigned_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;