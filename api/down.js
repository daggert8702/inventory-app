export default function handler(req, res) {
  res.status(503).json({
    status: "down",
    message: "Intentional Digital Den outage test"
  });
}
