import Department from "../model/department.model.js";
import { getMessage } from "../config/messages.js";

const successMessage = (key) => getMessage("success", key);
const errorMessage = (key) => getMessage("error", key);

export const createDepartment = async (req, res) => {
  const { name, description, avgServiceTime, isActive } = req.body;

  if (!name) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  const department = await Department.create({
    name,
    description,
    avgServiceTime,
    isActive,
  });

  res.status(201).json({
    success: true,
    message: successMessage("dataSaved"),
    data: department,
  });
};

export const getDepartments = async (req, res) => {
  const list = await Department.find().sort({ createdAt: -1 });
  res.json({ success: true, message: successMessage("requestAuthorized"), data: list });
};

export const getDepartment = async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }
  res.json({ success: true, message: successMessage("operationCompleted"), data: dept });
};

export const updateDepartment = async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!dept) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }
  res.json({ success: true, message: successMessage("dataSaved"), data: dept });
};

export const deleteDepartment = async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }
  await dept.deleteOne();
  res.json({ success: true, message: successMessage("actionExecuted") });
};
