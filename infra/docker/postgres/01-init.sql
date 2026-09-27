-- 确保安装 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建专门的服务 Schema
CREATE SCHEMA IF NOT EXISTS profile_schema;
CREATE SCHEMA IF NOT EXISTS telemetry_schema;

-- 设置默认搜索路径
SET search_path TO public, profile_schema, telemetry_schema;
