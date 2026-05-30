import Counter from "../model/counter.model.js";
import Department from "../model/department.model.js";
import User from "../model/user.model.js";
import { getMessage } from "../config/messages.js";

const successMessage = (key) => getMessage("success", key);
const errorMessage = (key) => getMessage("error", key);

export const createCounter = async (req, res) => {
  const { department } = req.body;

  if (!department) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  const dept = await Department.findById(department);
  if (!dept) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  const counter = await Counter.create({ ...req.body });
  res.status(201).json({ success: true, message: successMessage("dataSaved"), data: counter });
};

export const getCounters = async (req, res) => {
  const { department } = req.query;

  const filter = {};
  if (department) filter.department = department;

  const counters = await Counter.find(filter)
    .populate("department")
    .populate("staff", "-password")
    .sort({ createdAt: -1 });

  res.json({ success: true, message: successMessage("requestAuthorized"), data: counters });
};

export const updateCounter = async (req, res) => {
  const counter = await Counter.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!counter) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }
  res.json({ success: true, message: successMessage("dataSaved"), data: counter });
};

export const assignStaff = async (req, res) => {
  const { staffId } = req.body;

  const counter = await Counter.findById(req.params.id);
  if (!counter) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  if (staffId) {
    const staff = await User.findById(staffId).select("role department");
    if (!staff) {
      res.status(404);
      throw new Error(errorMessage("submissionFailed"));
    }
    if (!["staff", "admin"].includes(staff.role)) {
      res.status(400);
      throw new Error(errorMessage("authorizationDenied"));
    }

    // Enforce department scope for staff users; admin can be assigned across departments.
    if (staff.role === "staff") {
      if (!staff.department) {
        res.status(400);
        throw new Error(errorMessage("submissionFailed"));
      }
      if (String(staff.department) !== String(counter.department)) {
        res.status(400);
        throw new Error(errorMessage("submissionFailed"));
      }
    }
  }

  counter.staff = staffId || null;
  await counter.save();

  res.json({ success: true, message: successMessage("actionExecuted"), data: counter });
};
