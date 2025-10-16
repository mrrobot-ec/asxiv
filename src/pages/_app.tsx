import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/next";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/context/ThemeContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Navigation />
      <Component {...pageProps} />
      <Analytics />
    </ThemeProvider>
  );
}
