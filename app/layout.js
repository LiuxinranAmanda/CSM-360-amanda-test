import './globals.css';

export const metadata = {
  title: 'CSM 360 System',
  description: 'Customer Success Management 360 System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}