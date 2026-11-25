export default function handler(req, res) {
  res.status(200).json({
    supported: false,
    running: false,
    intervalMinutes: 70,
  });
}
