import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

// 1. Initialize Supabase Client (Done OUTSIDE the component)
const supabase = createClient(
  "https://xbosdjujcvfqujtdamun.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3NkanVqY3ZmcXVqdGRhbXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzUzNjksImV4cCI6MjA4MDkxMTM2OX0.BrKUQ_VGTfCbNW2dST3LHPz0UUbC9ZNn98mbb5FAVig"
);

function App() {
  const [message, setMessage] = useState("Connecting to Supabase...");

  // 2. This 'effect' runs once when the app starts
  useEffect(() => {
    async function fetchMessage() {
      // 3. Ask Supabase for the data
      const { data, error } = await supabase
        .from("global_message")
        .select("content")
        .single();

      if (error) {
        console.error("Supabase Error:", error);
        setMessage("Error: " + error.message);
      } 
      else if (data) {
        setMessage(data.content);
      }
    }

    fetchMessage();
  }, []);

  return (
    <main className="container">
      <h1>Anime Tracker v0.1</h1>
      <br />
      <p>Database Connection Status:</p>
      
      {/* 4. Display the message from the cloud */}
      <h2 style={{ color: "#646cff", fontSize: "24px" }}>
        {message}
      </h2>
    </main>
  );
}

export default App;