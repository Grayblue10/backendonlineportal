import asyncHandler from '../middlewares/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import Grade from '../models/Grade.model.js';

/**
 * @desc    Get all grades
 * @route   GET /api/grades
 * @access  Private
 */
const getGrades = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource with lean query for better performance
  let query = Grade.find(JSON.parse(queryStr))
    .lean()
    .populate([
      { path: 'student', select: 'name email', lean: true },
      { path: 'subject', select: 'name code', lean: true },
      { path: 'teacher', select: 'name email', lean: true }
    ]);

  // Select Fields - Add essential fields by default
  if (req.query.select) {
    const fields = `_id createdAt ${req.query.select.split(',').join(' ')}`;
    query = query.select(fields);
  }

  // Sort with index optimization
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort({ createdAt: -1 });
  }

  // Add query cache for frequently accessed data
  query = query.cache(300); // 5 minutes cache

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Grade.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const grades = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: grades.length,
    pagination,
    data: grades
  });
});

/**
 * @desc    Get single grade
 * @route   GET /api/grades/:id
 * @access  Private
 */
const getGrade = asyncHandler(async (req, res, next) => {
  const grade = await Grade.findById(req.params.id).populate([
    { path: 'student', select: 'name' },
    { path: 'subject', select: 'name' },
    { path: 'teacher', select: 'name' }
  ]);

  if (!grade) {
    return next(
      new ErrorResponse(`Grade not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is grade owner, teacher, or admin
  if (grade.student.toString() !== req.user.id && req.user.role !== 'admin' && grade.teacher.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to view this grade`, 401)
    );
  }

  res.status(200).json({ success: true, data: grade });
});

/**
 * @desc    Create new grade
 * @route   POST /api/grades
 * @access  Private/Teacher
 */
const createGrade = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.teacher = req.user.id;
  
  const grade = await Grade.create(req.body);
  
  res.status(201).json({
    success: true,
    data: grade
  });
});

/**
 * @desc    Update grade
 * @route   PUT /api/grades/:id
 * @access  Private/Teacher
 */
const updateGrade = asyncHandler(async (req, res, next) => {
  let grade = await Grade.findById(req.params.id);

  if (!grade) {
    return next(
      new ErrorResponse(`Grade not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is grade owner or admin
  if (grade.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to update this grade`, 401)
    );
  }

  grade = await Grade.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({ success: true, data: grade });
});

/**
 * @desc    Delete grade
 * @route   DELETE /api/grades/:id
 * @access  Private/Teacher
 */
const deleteGrade = asyncHandler(async (req, res, next) => {
  const grade = await Grade.findById(req.params.id);

  if (!grade) {
    return next(
      new ErrorResponse(`Grade not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is grade owner or admin
  if (grade.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to delete this grade`, 401)
    );
  }

  await grade.remove();

  res.status(200).json({ success: true, data: {} });
});

// Export all grade controller functions
export {
  getGrades,
  getGrade,
  createGrade,
  updateGrade,
  deleteGrade
};
