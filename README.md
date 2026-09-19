# Manju Groups CRM

A modern real-estate sales CRM built for Manju Groups to manage leads, property inventory, bookings, sales follow-ups, and team communication in one workspace.

This frontend is built with React, Vite, TypeScript, Tailwind and TanStack Router. It supports both admin and sales-employee workflows for a property sales team.

## Overview

The application helps the sales team:

- Track new and active property leads
- Move leads through sales stages
- Assign leads to sales representatives
- Manage unit availability and sales inventory
- Record property bookings and revenue
- Monitor follow-ups and overdue activities
- Collaborate via an internal chat screen

## Features

### Admin workspace
- Dashboard overview with lead pipeline, follow-ups and bookings
- Leads management with create, edit, filter and assign actions
- Property and unit tracking with status updates
- Booking tracking and payment value summaries
- Team visibility across sales activities

### Sales employee workspace
- Personal dashboard focused on assigned tasks
- Lead tracking for their own sales pipeline
- Assigned unit visibility
- Internal chat and communication workspace

## Tech stack

- React 19
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS
- Radix UI components
- React Query
- Node backend server

## Prerequisites

Before running the project, make sure you have:

- Node.js 18 or above
- npm or Bun
- A browser such as Chrome or Edge

## Installation

1. Open a terminal in the project folder.
2. Install dependencies:

```bash
npm install
```

3. Start the frontend development server:

```bash
npm run dev
```

The app will run on:

- https://sreemanisha10.github.io/manjugroups/


## Project structure

```text
src/
  components/
  lib/
  routes/
  api/
  styles.css
server/
  api-server.js
backend/
  CRM/
public/
```

## How the site works

### 1. Sign in or create an account

When you open the app, you will see the authentication screen.

- Use the Sign in tab for existing users
- Use Create account to register a new sales user or admin
- Roles supported:
  - Admin
  - Sales Employee

### 2. Dashboard

After login, the dashboard shows:

- lead pipeline overview
- today and overdue follow-ups
- unit availability
- booked value and conversion insights
- sales stage summary

### 3. Leads module

From the Leads page, you can:

- view all leads
- search by customer name or data
- filter by stage
- update stage or follow-up date
- assign leads to sales employees
- add new leads or edit existing records

### 4. Properties module

Use the Properties page to:

- view all available and sold units
- update unit status
- manage property inventory
- track assigned units for sales reps

### 5. Bookings module

The Bookings page helps track:

- confirmed property bookings
- booked unit information
- booking amount and related sales data
- customer-to-unit linkage

### 6. Employee view

Sales employees can view a role-specific page showing:

- their assigned leads
- active pipeline performance
- related unit assignments
- task focus for their sales queue

### 7. Chat

The Chat screen is intended as a sales communication area for internal messaging and follow-ups.

## Recommended user flow

For a standard sales workflow:

1. Create or review a lead
2. Assign the lead to the right sales employee
3. Update the stage as the customer moves from enquiry to booking
4. Schedule a follow-up date
5. Visit the property or coordinate a site visit
6. Mark the lead as interested, negotiation, or booked
7. Confirm the booking in the booking screen

## Environment notes

This project is configured for a frontend-first workflow. If you are integrating with backend APIs later, update the URL configuration in the API layer under:

- src/api/axios.ts

The app is structured so the frontend can be connected to external CRM endpoints without rewriting the screens.

## Troubleshooting

### The app does not start
- Ensure Node.js is installed
- Run npm install again
- Check if a port conflict exists on 8000

### Authentication fails
- Confirm the account details are correct
- Create a new account if needed
- Check the backend or API configuration for login endpoints

### Data is not loading
- Make sure the backend server is running if the app is connected to a live API
- Review the CRM endpoint configuration in src/api/axios.ts

## Production build

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## License

This project is for internal business use by Manju Groups and is intended as a CRM workspace for property sales operations.

## Notes

This project can be extended later with:

- real backend database integration
- role-based permissions
- PDF invoice generation
- document upload for customers
- advanced analytics and reporting
- notifications and reminders

---

For future handoff, keep this README updated whenever the UI is changed or new flows are added.
