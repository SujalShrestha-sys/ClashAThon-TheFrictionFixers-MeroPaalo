import Department from "../model/department.model.js";

export const createDepartment = async (req, res) => {
  const { name, description, avgServiceTime, isActive } = req.body;

  const department = await Department.create({
    name,
    description,
    avgServiceTime,
    isActive,
  });

  res.status(201).json(department);
};

export const getDepartments = async (req, res) => {
  const list = await Department.find().sort({ createdAt: -1 });
  res.json({ success: true, data: list });
};

export const getDepartment = async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) {
    res.status(404);
    throw new Error("Department not found");
  }
  res.json({ success: true, data: dept });
};

export const updateDepartment = async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!dept) {
    res.status(404);
    throw new Error("Department not found");
  }
  res.json({ success: true, data: dept });
};

export const deleteDepartment = async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) {
    res.status(404);
    throw new Error("Department not found");
  }
  await dept.deleteOne();
  res.json({ success: true, message: "Department deleted" });
};
