#ifndef SHARED_CONSTANTS_H
#define SHARED_CONSTANTS_H

static const char* SHARED_WATER_STATUS_COMPLETE = "complete";
static const char* SHARED_WATER_ACTION_ON = "WATER_ON";
static const char* SHARED_WATER_LEVEL_TOPIC = "home/plants/water_level";
static const char* SHARED_PUMP_TOPIC_TEMPLATE = "plants/{device_id}/pump";
static const char* SHARED_PUMP_TOPIC = "plants/{device_id}/pump";
static const char* SHARED_PUMP_CYCLE_COMPLETE_TOPIC = "home/plants/feedback";
static const int SHARED_PUMP_CYCLE_COOLDOWN_HOURS = 6;
static const char* SHARED_ENVIRONMENT_TEMP_1F_TOPIC = "home/sensors/temperature";
static const char* SHARED_ENVIRONMENT_HUMIDITY_1F_TOPIC = "home/sensors/humidity";
static const char* SHARED_ENVIRONMENT_PRESSURE_1F_TOPIC = "home/sensors/pressure";
static const char* SHARED_ENVIRONMENT_GAS_1F_TOPIC = "home/sensors/iaq";
static const char* SHARED_DEVICE_LOGS_TOPIC = "home/devices/logs";
static const char* SHARED_DEVICE_BOOT_TOPIC = "home/devices/boot";

#endif
