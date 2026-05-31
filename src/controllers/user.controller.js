import User from "../model/user.model.js";
import Department from "../model/department.model.js";
import { getMessage } from "../config/messages.js";

const successMessage = (key) => getMessage("success", key);
const errorMessage = (key) => getMessage("error", key);

// admin assigns role to a user
export const assignRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !["staff", "customer", "admin"].includes(role)) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  user.role = role;
  if (role !== "staff") {
    user.department = null;
  }
  await user.save();

  res.json({
    success: true,
    message: successMessage("dataSaved"),
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
};

export const assignDepartment = async (req, res) => {
  const { userId } = req.params;
  const { departmentId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  if (user.role !== "staff") {
    res.status(400);
    throw new Error(errorMessage("authorizationDenied"));
  }

  if (!departmentId) {
    user.department = null;
    await user.save();
    await user.populate("department", "name");

    return res.json({
      success: true,
      message: successMessage("dataSaved"),
      data: {
        id: user._id,
        name: user.name,
        role: user.role,
        department: user.department,
      },
    });
  }

  const department = await Department.findById(departmentId).select("_id name");
  if (!department) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  user.department = department._id;
  await user.save();
  await user.populate("department", "name");

  res.json({
    success: true,
    message: successMessage("dataSaved"),
    data: {
      id: user._id,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  });
};

export const listUsers = async (req, res) => {
  const { role } = req.query;

  const filter = {};
  if (role) filter.role = role;

  const users = await User.find(filter)
    .select("-password")
    .populate("department", "name")
    .sort({ createdAt: -1 });
  res.json({ success: true, message: successMessage("requestAuthorized"), data: users });
};

export const updateUser = async (req, res) => {
  const { userId } = req.params;
  const { name, email, phone, role, department } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  const nextName = typeof name === "string" ? name.trim() : undefined;
  const nextEmail =
    typeof email === "string" ? email.trim().toLowerCase() : undefined;
  const nextPhone = typeof phone === "string" ? phone.trim() : undefined;
  const nextRole = typeof role === "string" ? role.trim() : undefined;
  const nextDepartment =
    department === null || department === ""
      ? null
      : typeof department === "string"
        ? department.trim()
        : department;

  if (nextName !== undefined) {
    if (!nextName) {
      res.status(400);
      throw new Error(errorMessage("submissionFailed"));
    }
    user.name = nextName;
  }

  if (nextEmail !== undefined) {
    if (nextEmail) {
      const duplicateEmail = await User.findOne({
        email: nextEmail,
        _id: { $ne: user._id },
      }).select("_id");

      if (duplicateEmail) {
        res.status(409);
        throw new Error(errorMessage("submissionFailed"));
      }

      user.email = nextEmail;
    } else {
      user.email = undefined;
    }
  }

  if (nextPhone !== undefined) {
    if (nextPhone) {
      const duplicatePhone = await User.findOne({
        phone: nextPhone,
        _id: { $ne: user._id },
      }).select("_id");

      if (duplicatePhone) {
        res.status(409);
        throw new Error(errorMessage("submissionFailed"));
      }

      user.phone = nextPhone;
    } else {
      user.phone = undefined;
    }
  }

  if (nextRole !== undefined) {
    if (!["admin", "staff", "customer"].includes(nextRole)) {
      res.status(400);
      throw new Error(errorMessage("submissionFailed"));
    }

    user.role = nextRole;
    if (nextRole !== "staff") {
      user.department = null;
    }
  }

  if (nextDepartment !== undefined) {
    if (nextDepartment === null) {
      user.department = null;
    } else {
      if (user.role !== "staff") {
        res.status(400);
        throw new Error(errorMessage("authorizationDenied"));
      }

      const departmentDoc = await Department.findById(nextDepartment).select("_id");
      if (!departmentDoc) {
        res.status(404);
        throw new Error(errorMessage("submissionFailed"));
      }

      user.department = departmentDoc._id;
    }
  }

  await user.save();
  await user.populate("department", "name");

  return res.json({
    success: true,
    message: successMessage("dataSaved"),
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
    },
  });
};
