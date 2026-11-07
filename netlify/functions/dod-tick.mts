// Every 5 minutes: ask the app to send any Day of Deception missions that are
// due (see app/api/day-of-deception/tick). Scheduled functions only run on the
// production deploy.
export default async () => {
  const base = process.env.URL || "https://gamenightapp.netlify.app";
  const res = await fetch(`${base}/api/day-of-deception/tick`, { method: "POST" });
  console.log("dod-tick:", res.status, await res.text());
};

export const config = {
  schedule: "*/5 * * * *",
};
