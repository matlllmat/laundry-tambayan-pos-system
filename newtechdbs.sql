-- Create Database
CREATE DATABASE laundry_tambayan_pos_system;
USE laundry_tambayan_pos_system;

-- ============================================================
-- EMPLOYEES TABLE
-- ============================================================
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  salary DECIMAL(10, 2) DEFAULT 0.00,
  type ENUM('admin', 'employee') DEFAULT 'employee',
  daily_salary DECIMAL(12, 2) DEFAULT 0.00
);
-- Sample employee data
INSERT INTO employees (name, email, phone, password, salary, type)
VALUES 
('Ken Delos Santos', 'kds@example.com', '09181234567', '1234', 18000.00, 'admin'),
('John Martin P. Sapanta', 'sapanta@example.com', '09171234567', '1234', 15000.00, 'employee'),
('John Denver Davis', 'davis@example.com', '09991234567', '1234', 25000.00, 'employee');

-- ============================================================
-- ITEMS TABLE (SERVICES & ADDONS) 
-- ==========================================================
CREATE TABLE items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    item_type ENUM('service', 'addon', 'disabled') NOT NULL,
    item_price DECIMAL(10 , 2 ) NOT NULL
);

-- Services
INSERT INTO items (item_name, item_type, item_price)
VALUES
('Wash Only', 'disabled', 80.00),
('Wash and Dry', 'service', 120.00),
('Wash, Dry, and Fold', 'service', 150.00),
('Dry Only', 'service', 70.00),
('Iron Only', 'service', 100.00);

-- Add-ons
INSERT INTO items (item_name, item_type, item_price)
VALUES
('Fabric Conditioner', 'addon', 20.00),
('Bleach (White Clothes)', 'addon', 15.00),
('Plastic Wrap Packaging', 'addon', 10.00),
('Hanger Set (per load)', 'addon', 25.00),
('Express Service (Same Day)', 'addon', 50.00);


-- ============================================================
-- ORDERS TABLE & ORDER ITEMS TABLE (SNAPSHOT DATA)
-- ============================================================
CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  total_weight DECIMAL(10, 2) NOT NULL,
  total_load INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  contact VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  schedule_type ENUM('pickup', 'delivery') NOT NULL,
  schedule_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  order_status ENUM('pending', 'completed', 'late', 'unclaimed') DEFAULT 'pending',
  weight_per_load_snapshot DECIMAL(5, 2) DEFAULT 7.00,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

-- This table stores exact sold item/service details
-- at the time of sale — independent of items table.
CREATE TABLE order_items (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  calculated_amount DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

INSERT INTO orders 
(employee_id, total_weight, total_load, weight_per_load_snapshot, total_amount, customer_name, contact, address, schedule_type, schedule_date, order_status)
VALUES
(2, 14.00, 2, 7.00, 360.00, 'Maria Lopez', '09190001111', 'Taguig City', 'pickup', '2025-11-05', 'pending'),
(3, 7.00, 1, 7.00, 150.00, 'Juan Dela Cruz', '09998887777', 'Pasig City', 'delivery', '2025-11-04', 'completed');


INSERT INTO order_items (order_id, service_name, price, quantity, calculated_amount)
VALUES
(1, 'Wash and Dry', 120.00, 2, 240.00),
(1, 'Fabric Conditioner', 20.00, 3, 60.00),
(1, 'Plastic Wrap Packaging', 10.00, 6, 60.00),
(2, 'Dry Only', 150.00, 1, 150.00);

-- ============================================================
-- 3️⃣ SETTINGS TABLE (for admin-configurable values)
-- ============================================================
CREATE TABLE settings (
  setting_id INT AUTO_INCREMENT PRIMARY KEY,
  setting_name VARCHAR(100) UNIQUE NOT NULL,
  setting_value VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO settings (setting_name, setting_value)
VALUES
('system_title', 'Laundry Tambayan'),
('weight_per_load', '5'),
('load_limit', '20'),
('delivery_fee', '30');

-- ============================================================
-- 2️⃣ Budget & INCOME REPORTS TABLE (for tracking income vs expenses)
-- ============================================================
CREATE TABLE budget (
  budget_id INT AUTO_INCREMENT PRIMARY KEY,
  expense_name VARCHAR(100) NOT NULL,
  daily DECIMAL(12, 2) DEFAULT 0.00,
  budget_allocated DECIMAL(12,2) DEFAULT 0.00,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO budget (expense_name, daily, budget_allocated, date_start, date_end)
VALUES
('Water Refill', 150.00, 4500.00, '2025-01-01', '2025-01-30'),
('Electricity Bill', 200.00, 6000.00, '2025-01-01', '2025-01-30'),
('Laundry Supplies', 120.00, 3600.00, '2025-01-01', '2025-01-30'),
('Employee Snacks', 50.00, 1500.00, '2025-01-01', '2025-01-30'),
('Machine Maintenance', 180.00, 5400.00, '2025-01-01', '2025-01-30');

-- ============================================================
-- 2️⃣ INCOME REPORTSSSSSSSSS WAAAAahHHHHHHHHHhh
-- ============================================================
-- Stores saved financial reports for specific date ranges
CREATE TABLE income_report_snapshots (
  snapshot_id INT AUTO_INCREMENT PRIMARY KEY,
  report_name VARCHAR(150) NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  
  -- Financial Totals
  gross_income DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_expenses DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  net_income DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  
  -- Metadata
  total_orders INT NOT NULL DEFAULT 0,
  total_budget_entries INT NOT NULL DEFAULT 0,
  
  -- Audit Trail
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  
  FOREIGN KEY (created_by) REFERENCES employees(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  
  -- Ensure no duplicate date ranges with same name
  UNIQUE KEY unique_report (report_name, date_from, date_to)
);

-- ============================================================
-- SNAPSHOT EXPENSE DETAILS TABLE
-- ============================================================
-- Stores detailed breakdown of expenses included in each snapshot
CREATE TABLE snapshot_expense_details (
  detail_id INT AUTO_INCREMENT PRIMARY KEY,
  snapshot_id INT NOT NULL,
  
  -- Budget Entry Reference (for traceability)
  budget_id INT,
  expense_name VARCHAR(100) NOT NULL,
  
  -- Budget Entry Details (at time of snapshot)
  budget_allocated DECIMAL(12, 2) NOT NULL,
  daily_cost DECIMAL(12, 2) NOT NULL,
  budget_date_start DATE NOT NULL,
  budget_date_end DATE NOT NULL,
  
  -- Calculated Overlap
  overlap_days INT NOT NULL,
  proportional_expense DECIMAL(12, 2) NOT NULL,
  
  FOREIGN KEY (snapshot_id) REFERENCES income_report_snapshots(snapshot_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  
  FOREIGN KEY (budget_id) REFERENCES budget(budget_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_snapshot_dates ON income_report_snapshots(date_from, date_to);
CREATE INDEX idx_snapshot_created ON income_report_snapshots(created_at);
CREATE INDEX idx_snapshot_creator ON income_report_snapshots(created_by);
CREATE INDEX idx_expense_detail_snapshot ON snapshot_expense_details(snapshot_id);

-- ============================================================
-- SAMPLE DATA
-- ============================================================
-- Example: January 2025 Monthly Report
INSERT INTO income_report_snapshots 
(report_name, date_from, date_to, gross_income, total_expenses, net_income, total_orders, total_budget_entries, created_by, notes)
VALUES
('January 2025 Monthly Report', '2025-01-01', '2025-01-31', 45000.00, 21100.00, 23900.00, 25, 5, 1, 'First month operations - strong performance'),
('Q1 2025 Report', '2025-01-01', '2025-03-31', 135000.00, 63300.00, 71700.00, 78, 5, 1, 'Quarter 1 summary for stakeholder presentation');

-- Detailed expense breakdown for January report
INSERT INTO snapshot_expense_details 
(snapshot_id, budget_id, expense_name, budget_allocated, daily_cost, budget_date_start, budget_date_end, overlap_days, proportional_expense)
VALUES
-- Snapshot 1: January 2025 (31 days)
(1, 1, 'Water Refill', 4500.00, 150.00, '2025-01-01', '2025-01-30', 30, 4500.00),
(1, 2, 'Electricity Bill', 6000.00, 200.00, '2025-01-01', '2025-01-30', 30, 6000.00),
(1, 3, 'Laundry Supplies', 3600.00, 120.00, '2025-01-01', '2025-01-30', 30, 3600.00),
(1, 4, 'Employee Snacks', 1500.00, 50.00, '2025-01-01', '2025-01-30', 30, 1500.00),
(1, 5, 'Machine Maintenance', 5400.00, 180.00, '2025-01-01', '2025-01-30', 30, 5400.00);