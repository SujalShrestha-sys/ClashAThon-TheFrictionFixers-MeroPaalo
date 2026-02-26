import User from "../model/user.model.js";
import Department from "../model/department.model.js";

// admin assigns role to a user
export const assignRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !["staff", "customer", "admin"].includes(role)) {
    res.status(400);
    throw new Error("role must be one of: staff, customer, admin");
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.role = role;
  if (role !== "staff") {
    user.department = null;
  }
  await user.save();

  res.json({
    success: true,
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
    throw new Error("User not found");
  }

  if (user.role !== "staff") {
    res.status(400);
    throw new Error("Only staff users can be assigned to a department");
  }

  if (!departmentId) {
    user.department = null;
    await user.save();
    await user.populate("department", "name");

    return res.json({
      success: true,
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
    throw new Error("Department not found");
  }

  user.department = department._id;
  await user.save();
  await user.populate("department", "name");

  res.json({
    success: true,
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
  res.json({ success: true, data: users });
};
