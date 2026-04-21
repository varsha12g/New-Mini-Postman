function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please login to continue."
    });
  }

  return next();
}

function requirePageAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  return next();
}

function attachUser(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
}

module.exports = {
  requireAuth,
  requirePageAuth,
  attachUser
};
