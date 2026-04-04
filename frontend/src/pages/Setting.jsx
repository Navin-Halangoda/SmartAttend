import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Setting() {
  const [availableCameras, setAvailableCameras] = useState([]);
  const [settings, setSettings] = useState({
    addMemberMode: 'device',
    attendanceMode: 'device',
    add_member_camera: '0',
    attendance_camera: '0',
    add_member_wifi_url: '',
    attendance_wifi_url: ''
  });
  const [testingCamera, setTestingCamera] = useState(null);
  const [testResult, setTestResult] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [camerasRes, settingsRes] = await Promise.all([
        api.get('/api/available-cameras'),
        api.get('/api/camera-settings')
      ]);
      setAvailableCameras(camerasRes.data?.cameras || []);
      const addMemberRaw = String(settingsRes.data?.add_member_camera || '0').trim();
      const attendanceRaw = String(settingsRes.data?.attendance_camera || '0').trim();

      const addMemberIsWifi = addMemberRaw.startsWith('http');
      const attendanceIsWifi = attendanceRaw.startsWith('http');

      setSettings({
        addMemberMode: addMemberIsWifi ? 'wifi' : 'device',
        attendanceMode: attendanceIsWifi ? 'wifi' : 'device',
        add_member_camera: addMemberIsWifi ? '0' : (addMemberRaw || '0'),
        attendance_camera: attendanceIsWifi ? '0' : (attendanceRaw || '0'),
        add_member_wifi_url: addMemberIsWifi ? addMemberRaw : '',
        attendance_wifi_url: attendanceIsWifi ? attendanceRaw : ''
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load camera settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectCamera = (target, value) => {
    if (target === 'add_member_camera') {
      if (value === 'wifi') {
        setSettings((prev) => ({
          ...prev,
          addMemberMode: 'wifi'
        }));
      } else {
        setSettings((prev) => ({
          ...prev,
          addMemberMode: 'device',
          add_member_camera: value
        }));
      }
    }

    if (target === 'attendance_camera') {
      if (value === 'wifi') {
        setSettings((prev) => ({
          ...prev,
          attendanceMode: 'wifi'
        }));
      } else {
        setSettings((prev) => ({
          ...prev,
          attendanceMode: 'device',
          attendance_camera: value
        }));
      }
    }

    setMessage('');
    setError('');
  };

  const getCameraValueForTest = (cameraType) => {
    if (cameraType === 'add_member_camera') {
      return settings.addMemberMode === 'wifi'
        ? settings.add_member_wifi_url.trim()
        : settings.add_member_camera;
    }
    return settings.attendanceMode === 'wifi'
      ? settings.attendance_wifi_url.trim()
      : settings.attendance_camera;
  };

  const testCamera = async (cameraType) => {
    setTestingCamera(cameraType);
    setTestResult(prev => ({
      ...prev,
      [cameraType]: null
    }));

    try {
      const camera = getCameraValueForTest(cameraType);
      if (!camera) {
        setTestResult(prev => ({
          ...prev,
          [cameraType]: {
            success: false,
            message: 'Please enter WiFi camera URL before testing.'
          }
        }));
        setTestingCamera(null);
        return;
      }
      const response = await api.post('/api/test-camera', { camera });
      setTestResult(prev => ({
        ...prev,
        [cameraType]: response.data
      }));
    } catch (err) {
      setTestResult(prev => ({
        ...prev,
        [cameraType]: {
          success: false,
          message: err?.response?.data?.message || 'Failed to test camera.'
        }
      }));
    } finally {
      setTestingCamera(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const addMemberCameraValue = settings.addMemberMode === 'wifi'
        ? settings.add_member_wifi_url.trim()
        : settings.add_member_camera;
      const attendanceCameraValue = settings.attendanceMode === 'wifi'
        ? settings.attendance_wifi_url.trim()
        : settings.attendance_camera;

      if (settings.addMemberMode === 'wifi' && !addMemberCameraValue) {
        setError('Please enter Add Member WiFi camera URL.');
        setIsSaving(false);
        return;
      }

      if (settings.attendanceMode === 'wifi' && !attendanceCameraValue) {
        setError('Please enter Attendance WiFi camera URL.');
        setIsSaving(false);
        return;
      }

      const response = await api.put('/api/camera-settings', {
        add_member_camera: addMemberCameraValue || '0',
        attendance_camera: attendanceCameraValue || '0'
      });
      setMessage(response.data?.message || 'Settings saved successfully.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Add Member Camera Configuration */}
      <div className="theme-card p-6">
        <div className="border-b border-border pb-4">
          <h2 className="text-2xl font-bold">Add Member Camera</h2>
          <p className="mt-1 text-sm text-text-muted">Configure camera for member addition</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-text-muted">Select Camera</label>
            <select
              name="add_member_camera"
              value={settings.addMemberMode === 'wifi' ? 'wifi' : settings.add_member_camera}
              onChange={(e) => handleSelectCamera('add_member_camera', e.target.value)}
              className="theme-input mt-2"
            >
              <option value="0">Camera 0 (Default)</option>
              {availableCameras.map(cam => (
                <option key={cam} value={String(cam)}>Camera {cam}</option>
              ))}
              <option value="wifi">WiFi Camera</option>
            </select>
          </div>

          {settings.addMemberMode === 'wifi' && (
            <div>
              <label className="text-sm font-medium text-text-muted">WiFi Camera URL</label>
              <input
                type="text"
                placeholder="e.g., http://192.168.1.100:8080/video"
                className="theme-input mt-2"
                value={settings.add_member_wifi_url}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  add_member_wifi_url: e.target.value
                }))}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => testCamera('add_member_camera')}
              disabled={testingCamera === 'add_member_camera'}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-background disabled:opacity-50"
            >
              {testingCamera === 'add_member_camera' ? 'Testing...' : 'Test Camera'}
            </button>
          </div>

          {testResult.add_member_camera && (
            <p className={`rounded-md px-3 py-2 text-sm ${
              testResult.add_member_camera.success
                ? 'border border-green-300 bg-green-50 text-green-700'
                : 'border border-yellow-300 bg-yellow-50 text-yellow-700'
            }`}>
              {testResult.add_member_camera.message}
            </p>
          )}
        </div>
      </div>

      {/* Attendance Camera Configuration */}
      <div className="theme-card p-6">
        <div className="border-b border-border pb-4">
          <h2 className="text-2xl font-bold">Attendance Camera</h2>
          <p className="mt-1 text-sm text-text-muted">Configure camera for attendance tracking</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-text-muted">Select Camera</label>
            <select
              name="attendance_camera"
              value={settings.attendanceMode === 'wifi' ? 'wifi' : settings.attendance_camera}
              onChange={(e) => handleSelectCamera('attendance_camera', e.target.value)}
              className="theme-input mt-2"
            >
              <option value="0">Camera 0 (Default)</option>
              {availableCameras.map(cam => (
                <option key={cam} value={String(cam)}>Camera {cam}</option>
              ))}
              <option value="wifi">WiFi Camera</option>
            </select>
          </div>

          {settings.attendanceMode === 'wifi' && (
            <div>
              <label className="text-sm font-medium text-text-muted">WiFi Camera URL</label>
              <input
                type="text"
                placeholder="e.g., http://192.168.1.100:8080/video"
                className="theme-input mt-2"
                value={settings.attendance_wifi_url}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  attendance_wifi_url: e.target.value
                }))}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => testCamera('attendance_camera')}
              disabled={testingCamera === 'attendance_camera'}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-background disabled:opacity-50"
            >
              {testingCamera === 'attendance_camera' ? 'Testing...' : 'Test Camera'}
            </button>
          </div>

          {testResult.attendance_camera && (
            <p className={`rounded-md px-3 py-2 text-sm ${
              testResult.attendance_camera.success
                ? 'border border-green-300 bg-green-50 text-green-700'
                : 'border border-yellow-300 bg-yellow-50 text-yellow-700'
            }`}>
              {testResult.attendance_camera.message}
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="theme-btn-primary px-6 py-3"
        >
          {isSaving ? 'Saving...' : 'Save Camera Settings'}
        </button>
      </div>
    </div>
  );
}

