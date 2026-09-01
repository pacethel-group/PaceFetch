export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "PaceFetch",
    backend: "Vercel",
    timestamp: new Date().toISOString()
  });
}
