package models

import "time"

// Acesso espelha a tabela `acessos` (underscored:true, timestamps:false — sem
// created_at/updated_at, só `timestamp`). Usado para logging/analytics de
// acessos ao sistema. Ver spec §4.4.
type Acesso struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	TenantID       *uint     `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`
	IP             string    `gorm:"column:ip;not null" json:"ip"`
	Referer        *string   `gorm:"column:referer" json:"referer"`
	UserAgent      *string   `gorm:"column:user_agent" json:"user_agent"`
	DeviceType     *string   `gorm:"column:device_type" json:"device_type"`
	Page           *string   `gorm:"column:page" json:"page"`
	GeoCity        *string   `gorm:"column:geo_city" json:"geo_city"`
	GeoRegion      *string   `gorm:"column:geo_region" json:"geo_region"`
	GeoCountry     *string   `gorm:"column:geo_country" json:"geo_country"`
	GeoTimezone    *string   `gorm:"column:geo_timezone" json:"geo_timezone"`
	GeoCoordinates *string   `gorm:"column:geo_coordinates" json:"geo_coordinates"` // TEXT, JSON "[lat,lng]"
	Timestamp      time.Time `gorm:"column:timestamp" json:"timestamp"`
	UserID         *uint     `gorm:"column:user_id" json:"user_id"`

	User *User `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
}

func (Acesso) TableName() string { return "acessos" }
