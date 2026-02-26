import Counter from "../model/counter.model.js";
import Department from "../model/department.model.js";
import User from "../model/user.model.js";

export const createCounter = async (req, res) => {
  const { department } = req.body;

  if (!department) {
    res.status(400);
    throw new Error("department is required");
  }

  const dept = await Department.findById(department);
  if (!dept) {
    res.status(404);
    throw new Error("Department not found");
  }

  const counter = await Counter.create({ ...req.body });
  res.status(201).json({ success: true, data: counter });
};

export const getCounters = async (req, res) => {
  const { department } = req.query;

  const filter = {};
  if (department) filter.department = department;

  const counters = await Counter.find(filter)
    .populate("department")
    .populate("staff", "-password")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: counters });
};

export const updateCounter = async (req, res) => {
  const counter = await Counter.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!counter) {
    res.status(404);
    throw new Error("Counter not found");
  }
  res.json({ success: true, data: counter });
};

export const assignStaff = async (req, res) => {
  const { staffId } = req.body;

  const counter = await Counter.findById(req.params.id);
  if (!counter) {
    res.status(404);
    throw new Error("Counter not found");
  }

  if (staffId) {
    const staff = await User.findById(staffId).select("role department");
    if (!staff) {
      res.status(404);
      throw new Error("Staff user not found");
    }
    if (!["staff", "admin"].includes(staff.role)) {
      res.status(400);
      throw new Error("User is not staff/admin");
    }

    // Enforce department scope for staff users; admin can be assigned across departments.
    if (staff.role === "staff") {
      if (!staff.department) {
        res.status(400);
        throw new Error("Staff must be assigned to a department before counter assignment");
      }
      if (String(staff.department) !== String(counter.department)) {
        res.status(400);
        throw new Error("Staff department does not match counter department");
      }
    }
  }

  counter.staff = staffId || null;
  await counter.save();

  res.json({ success: true, data: counter });
};
