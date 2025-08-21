import { expect } from 'chai';
import sinon from 'sinon';
import mongoose from 'mongoose';
import { requireRole, requireMinRole, requirePermission } from '../middlewares/rbac.middleware.js';
import { ROLES } from '../controllers/auth.controller.js';

// Test suite for RBAC middleware
describe('RBAC Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {};
    next = sinon.spy();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('requireRole', () => {
    it('should call next() for admin role', () => {
      req.user = { role: 'admin' };
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(next.calledOnce).to.be.true;
    });

    it('should return 403 for unauthorized role', () => {
      req.user = { role: 'student' };
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(next.firstCall.args[0].statusCode).to.equal(403);
    });
  });

  describe('requireMinRole', () => {
    it('should allow admin to access teacher route', () => {
      req.user = { role: ROLES.ADMIN };
      const middleware = requireMinRole(ROLES.TEACHER);
      middleware(req, res, next);
      expect(next.calledOnce).to.be.true;
    });

    it('should block student from accessing teacher route', () => {
      req.user = { role: ROLES.STUDENT };
      const middleware = requireMinRole(ROLES.TEACHER);
      middleware(req, res, next);
      expect(next.firstCall.args[0].statusCode).to.equal(403);
    });
  });

  describe('requirePermission', () => {
    it('should allow user with required permission', () => {
      req.user = { 
        role: ROLES.ADMIN,
        permissions: ['manage_users']
      };
      const middleware = requirePermission('manage_users');
      middleware(req, res, next);
      expect(next.calledOnce).to.be.true;
    });
  });
});
