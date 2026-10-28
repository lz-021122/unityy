using System;

namespace UnityInspect
{
    [Serializable]
    public sealed class UnityInspectPosition
    {
        public float x;
        public float y;
        public float z;
    }

    [Serializable]
    public sealed class UnityInspectIssue
    {
        public string id;
        public string title;
        public string desc;
        public string priority;
        public string status;
        public string scene;
        public UnityInspectPosition pos;
        public string createdAt;
        public string updatedAt;
        public string screenshot;
        public string reporter;
        public string assignee;
        public string deviceCode;
        public int severityScore;
    }

    [Serializable]
    public sealed class UnityInspectIssueListResponse
    {
        public UnityInspectIssue[] items;
        public int page;
        public int pageSize;
        public int total;
    }

    [Serializable]
    public sealed class UnityInspectSmokeResult
    {
        public string status;
        public int statusCode;
        public int issueCount;
        public int markerCount;
        public int total;
        public string error;
        public bool playMode;
        public string completedAtUtc;
    }
}
