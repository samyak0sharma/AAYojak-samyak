import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout';
import { ProtectedRoute, RoleProtectedRoute } from './components/auth';
import { OrganizerLayout } from './components/organizer/OrganizerLayout';
import { AboutPage } from './pages/AboutPage';
import { AccountPage } from './pages/AccountPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventsPage } from './pages/EventsPage';
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage, VerifyEmailPage } from './pages/AuthPages';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrganizerDetailPage } from './pages/OrganizerDetailPage';
import { OrganizersPage } from './pages/OrganizersPage';
import { OrganizerAnalyticsPage } from './pages/organizer/OrganizerAnalyticsPage';
import { OrganizerAttendeesPage } from './pages/organizer/OrganizerAttendeesPage';
import { OrganizerBookingsPage } from './pages/organizer/OrganizerBookingsPage';
import { OrganizerDashboardPage } from './pages/organizer/OrganizerDashboardPage';
import { OrganizerEventFormPage } from './pages/organizer/OrganizerEventFormPage';
import { OrganizerEventsPage } from './pages/organizer/OrganizerEventsPage';
import { OrganizerProfilePage } from './pages/organizer/OrganizerProfilePage';
import { OrganizerRevenuePage } from './pages/organizer/OrganizerRevenuePage';
import { OrganizerSettingsPage } from './pages/organizer/OrganizerSettingsPage';
import { OrganizerTicketsPage } from './pages/organizer/OrganizerTicketsPage';

export function App() {
  return <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:slug" element={<EventDetailPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/organizers" element={<OrganizersPage />} />
      <Route path="/organizers/:id" element={<OrganizerDetailPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route element={<ProtectedRoute />}><Route path="/dashboard" element={<AccountPage />} /></Route>
      <Route element={<RoleProtectedRoute roles={['ORGANIZER']} />}>
        <Route path="/dashboard/organizer" element={<OrganizerLayout />}>
          <Route index element={<OrganizerDashboardPage />} />
          <Route path="events" element={<OrganizerEventsPage />} />
          <Route path="events/new" element={<OrganizerEventFormPage />} />
          <Route path="events/:id/edit" element={<OrganizerEventFormPage />} />
          <Route path="bookings" element={<OrganizerBookingsPage />} />
          <Route path="attendees" element={<OrganizerAttendeesPage />} />
          <Route path="tickets" element={<OrganizerTicketsPage />} />
          <Route path="revenue" element={<OrganizerRevenuePage />} />
          <Route path="analytics" element={<OrganizerAnalyticsPage />} />
          <Route path="profile" element={<OrganizerProfilePage />} />
          <Route path="settings" element={<OrganizerSettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
