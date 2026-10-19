# Vergo App Frontend

This is the frontend application for the Vergo web system.

The frontend is built with **Next.js**, **React**, **TypeScript**, and **Tailwind CSS**.

This README is only for the frontend project.

## Project Location

The frontend project is inside the `frontend` folder.

```text
vergo-app/
└── frontend/
```

All frontend commands must be run inside the `frontend` folder.

## Technology Stack

This frontend uses:

* Next.js
* React
* TypeScript
* Tailwind CSS
* Node.js
* npm

## Getting Started

Follow these steps to set up the frontend project on your computer.

### 1. Clone the Repository

```bash
git clone <repository-url>
```

Go inside the main project folder:

```bash
cd vergo-app
```

### 2. Switch to the Development Branch

The main development branch is `dev`.

```bash
git checkout dev
```

Pull the latest code:

```bash
git pull origin dev
```

### 3. Go Inside the Frontend Folder

```bash
cd frontend
```

### 4. Install Dependencies

Install the frontend packages:

```bash
npm install
```

### 5. Set Up Environment Variables

Create a file called:

```bash
.env.local
```

This file must be created inside the `frontend` folder.

If the project has an example environment file, copy it:

```bash
cp .env.example .env.local
```

For Windows PowerShell:

```bash
Copy-Item .env.example .env.local
```

Update the values inside `.env.local` based on the frontend requirements.

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Do not upload `.env.local` to GitHub.

### 6. Run the Development Server

Start the frontend development server:

```bash
npm run dev
```

Open the frontend in your browser:

```text
http://localhost:3000
```

## Useful Commands

Run these commands inside the `frontend` folder.

Run the development server:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

Start the production build:

```bash
npm start
```

Run linting:

```bash
npm run lint
```

## Frontend Development

The main frontend files are inside the `frontend/app` folder.

Example:

```text
frontend/app/page.tsx
```

When the development server is running, the browser updates automatically when you edit files.

## Branch Workflow

The team uses this branch flow:

```text
task branch → dev → main
```

Use `dev` for development.

Use `main` only for stable release code.

Do not work directly on `main`.

Do not work directly on `dev` unless the team agrees.

## Creating a Task Branch

Before starting a task, update your local `dev` branch from the main project folder:

```bash
git checkout dev
git pull origin dev
```

Create a new branch for your ClickUp task:

```bash
git checkout -b docs/CU-123-update-readme
```

Recommended branch format:

```text
type/clickup-task-id-short-task-name
```

Examples:

```text
feature/CU-123-customer-login
bugfix/CU-124-fix-navbar
docs/CU-125-update-readme
```

## Saving Your Work

Check changed files:

```bash
git status
```

Add changes:

```bash
git add .
```

Commit changes:

```bash
git commit -m "CU-123 - Update frontend README file"
```

Push your branch:

```bash
git push origin docs/CU-123-update-readme
```

## Pull Request Rules

After finishing a task, create a Pull Request from your task branch to `dev`.

Example:

```text
docs/CU-123-update-readme → dev
```

Do not create normal task Pull Requests directly to `main`.

The team will review the Pull Request before merging it into `dev`.

## ClickUp Status Guide

Use these ClickUp statuses:

### TO DO

The task has not started.

### IN PROGRESS

The developer has started the task.

### READY FOR REVIEW

The code is pushed and a Pull Request to `dev` is created.

### CHANGES REQUESTED

The reviewer asked for changes.

### COMPLETE

The Pull Request is approved and merged into `dev`.

## Common Problems

### Port 3000 Already in Use

Run the frontend on another port:

```bash
npm run dev -- -p 3001
```

Then open:

```text
http://localhost:3001
```

### Dependency Issues

Try reinstalling dependencies inside the `frontend` folder:

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

For Windows PowerShell:

```bash
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Wrong Folder

If `npm install` or `npm run dev` does not work, check that you are inside the `frontend` folder.

```bash
pwd
```

On Windows PowerShell:

```bash
Get-Location
```

You should be inside:

```text
vergo-app/frontend
```

### Wrong Branch

Check your current branch:

```bash
git branch
```

Switch back to `dev`:

```bash
git checkout dev
git pull origin dev
```

## Frontend Folder Structure

Basic frontend structure:

```text
vergo-app/
└── frontend/
    ├── app/
    │   └── page.tsx
    ├── public/
    ├── package.json
    ├── README.md
    └── .env.local
```

## Important Notes

* This README is for the frontend only.
* Run frontend commands inside the `frontend` folder.
* Do not add backend setup details here.
* Do not add POS system setup details here.
* Always create Pull Requests to `dev` for normal frontend tasks.
