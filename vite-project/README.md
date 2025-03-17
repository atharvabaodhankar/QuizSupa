# QuizSupa - Modern MCQ Test Platform

QuizSupa is a modern, responsive MCQ test platform built with React, Vite, and Supabase. It provides a seamless experience for teachers to create and manage tests, and for students to take tests and track their progress.

## Features

### For Teachers
- Create and manage MCQ tests
- Add questions with multiple options
- Set test duration and points per question
- Publish/unpublish tests
- View student results and analytics

### For Students
- View available tests
- Take tests with timer functionality
- Track test history and performance
- View detailed results and explanations

## Tech Stack

- **Frontend**: React with Vite
- **UI Framework**: Chakra UI
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Routing**: React Router

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/quizsupa.git
   cd quizsupa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Database Setup

1. Create a new Supabase project
2. Create the following tables in your Supabase database:

```sql
-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade,
  role text check (role in ('teacher', 'student')),
  name text,
  email text,
  primary key (id)
);

-- Create tests table
create table tests (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  duration_minutes integer not null,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create questions table
create table questions (
  id uuid default uuid_generate_v4() primary key,
  test_id uuid references tests(id) on delete cascade,
  question_text text not null,
  explanation text,
  points integer not null default 1
);

-- Create options table
create table options (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false
);

-- Create test_attempts table
create table test_attempts (
  id uuid default uuid_generate_v4() primary key,
  test_id uuid references tests(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  score integer
);

-- Create answers table
create table answers (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references test_attempts(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  selected_option_id uuid references options(id) on delete cascade,
  is_correct boolean not null
);
```

3. Set up Row Level Security (RLS) policies for each table to ensure proper access control.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Chakra UI](https://chakra-ui.com/) for the beautiful UI components
- [Supabase](https://supabase.com/) for the backend infrastructure
- [React](https://reactjs.org/) for the frontend framework
- [Vite](https://vitejs.dev/) for the build tool
