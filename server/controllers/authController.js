import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, preferredLanguage } = req.body;

  if (!name || !email || !password || !preferredLanguage) {
    res.status(400);
    throw new Error('Please provide name, email, password and preferredLanguage');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    preferredLanguage,
  });

  if (user) {
    const token = generateToken(user._id);
    console.log(`Register success: user=${user.email} id=${user._id}`);
    console.log(`Token created for user ${user._id}`);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      token,
    });
  } else {
    console.log(`Register failed for email=${email}`);
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id);
    console.log(`Login success: user=${user.email} id=${user._id}`);
    console.log(`Token created for user ${user._id}`);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      token,
    });
  } else {
    console.log(`Login failed for email=${email}`);
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

export { registerUser, loginUser };
