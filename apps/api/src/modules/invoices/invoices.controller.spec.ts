import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

describe('InvoicesController (RBAC & Tenant Isolation)', () => {
  let controller: InvoicesController;
  let mockInvoicesService: jest.Mocked<Partial<InvoicesService>>;
  let mockResponse: any;

  beforeEach(() => {
    mockInvoicesService = {
      list: jest.fn(),
      get: jest.fn(),
      confirm: jest.fn(),
      cancel: jest.fn(),
      send: jest.fn(),
      pdf: jest.fn(),
    };
    controller = new InvoicesController(mockInvoicesService as unknown as InvoicesService);
    mockResponse = {
      set: jest.fn(),
      send: jest.fn(),
    };
  });

  describe('pdf endpoint tenant security', () => {
    it('throws NotFoundException if a CUSTOMER requests another customer invoice PDF', async () => {
      (mockInvoicesService.get as jest.Mock).mockResolvedValue({
        id: 'inv-target',
        customerId: 'customer-other',
      });

      const customerUser = {
        id: 'user-1',
        email: 'customer@test.com',
        role: Role.CUSTOMER,
        customerId: 'customer-mine',
        mustChangePassword: false,
      };

      await expect(
        controller.pdf(customerUser, 'inv-target', mockResponse),
      ).rejects.toThrow(NotFoundException);
      expect(mockInvoicesService.pdf).not.toHaveBeenCalled();
    });

    it('allows a CUSTOMER to download their own invoice PDF', async () => {
      (mockInvoicesService.get as jest.Mock).mockResolvedValue({
        id: 'inv-target',
        customerId: 'customer-mine',
      });
      (mockInvoicesService.pdf as jest.Mock).mockResolvedValue({
        number: 'INV-000001',
        pdf: Buffer.from('test-pdf'),
      });

      const customerUser = {
        id: 'user-1',
        email: 'customer@test.com',
        role: Role.CUSTOMER,
        customerId: 'customer-mine',
        mustChangePassword: false,
      };

      await controller.pdf(customerUser, 'inv-target', mockResponse);
      expect(mockInvoicesService.pdf).toHaveBeenCalledWith('inv-target');
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="INV-000001.pdf"',
      });
      expect(mockResponse.send).toHaveBeenCalledWith(Buffer.from('test-pdf'));
    });

    it('allows an ADMIN or INTERNAL staff to download any invoice PDF', async () => {
      (mockInvoicesService.get as jest.Mock).mockResolvedValue({
        id: 'inv-target',
        customerId: 'customer-other',
      });
      (mockInvoicesService.pdf as jest.Mock).mockResolvedValue({
        number: 'INV-000001',
        pdf: Buffer.from('admin-pdf'),
      });

      const adminUser = {
        id: 'admin-1',
        email: 'admin@brightloop.io',
        role: Role.ADMIN,
        customerId: null,
        mustChangePassword: false,
      };

      await controller.pdf(adminUser, 'inv-target', mockResponse);
      expect(mockInvoicesService.pdf).toHaveBeenCalledWith('inv-target');
      expect(mockResponse.send).toHaveBeenCalledWith(Buffer.from('admin-pdf'));
    });
  });
});
