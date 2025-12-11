import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatBubble from '../components/ChatBubble';

export default function SiteLayout() {
  return (
    <>
      <Topbar />
      <Header />
      <Navbar />
      <Outlet />
      <ChatBubble />
      <Footer />
    </>
  );
}
