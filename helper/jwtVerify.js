import jwt from "jsonwebtoken";
import config from "../config/config.js";
import DB from "../commonQuery/commonQuery.js";

export const jwtVerify = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      var token = req.headers.authorization.replace(`${config.jwtName}-`, "");
      const decoded = jwt.verify(token, config.jwtSecret);
      req.payload = decoded;
      var exits = await DB.AsyncfindOne(
        "users",
        { _id: req.payload.userId },
        {}
      );
      if (exits) {
        next();
      } else {
        return res.status(400).json({
          status: false,
          errors: { message: "Unauthorized user", authToken: null },
        });
      }
    } else {
      return res.status(403).json({
        status: false,
        errors: { message: "Unauthorized user", authToken: null },
      });
    }
  } catch (err) {
    console.log(err, "errr jwtverify");
    return res.status(403).json({
      status: false,
      errors: { message: "Unauthorized user", authToken: null },
    });
  }
};

export const jwtSign = (payload) => {
  try {
    if (payload) {
      const expiresIn = 24 * 60 * 60;
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn });
      return `${config.jwtName}-${token}`;
    } else {
      return null;
    }
  } catch (err) {
    return null;
  }
};

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.payload?.roles || []; // from jwtVerify
    const ok = userRoles.some((r) => allowedRoles.includes(r));

    if (!ok) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: insufficient role",
      });
    }
    next();
  };
}
