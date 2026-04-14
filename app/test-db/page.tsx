"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  grade: string | null;
};

export default function TestDbPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("id");

      if (error) {
        setError(error.message);
        return;
      }

      setRows((data ?? []) as Employee[]);
    };

    run();
  }, []);

  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-semibold">DB test</h1>
      {error ? <div className="mb-4 text-red-600">{error}</div> : null}
      <pre className="rounded border p-4">{JSON.stringify(rows, null, 2)}</pre>
    </main>
  );
}