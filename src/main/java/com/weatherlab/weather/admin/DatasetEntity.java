package com.weatherlab.weather.admin;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("weather_dataset")
public class DatasetEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    @TableField("file_path")
    private String filePath;
    private String description;
    @TableField("row_count")
    private long rowCount;
    @TableField("field_count")
    private int fieldCount;
    private String status;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public long getRowCount() { return rowCount; }
    public void setRowCount(long rowCount) { this.rowCount = rowCount; }
    public int getFieldCount() { return fieldCount; }
    public void setFieldCount(int fieldCount) { this.fieldCount = fieldCount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
