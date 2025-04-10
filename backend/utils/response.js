exports.send = (req, res, status, key, params = {}, extra = {}) => {
  const ok = status < 400;
  return res.status(status).json({
    success : ok,
    message : req.t(key, params),
    ...extra
  });
};
