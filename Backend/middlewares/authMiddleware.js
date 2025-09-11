module.exports.requireRole = function(allowedRoles = []) {
  return (req, res, next) => {
    // Simple derived role from email domain for demo
    const email = req.user?.email || "";
    let role = "User";
    if (email.endsWith("@vnu.edu.vn")) role = "Issuer";
    if (email === process.env.ADMIN_EMAIL) role = "Admin";

    req.user = req.user || {};
    req.user.role = role;

    if (allowedRoles.length && !allowedRoles.includes(role)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };
};
