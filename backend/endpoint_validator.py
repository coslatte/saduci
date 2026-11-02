#!/usr/bin/env python3
"""
SADECI-CORE ENDPOINT VALIDATOR
Quick test script to validate all endpoints are responding
Run this after Docker Compose is up: uv run python endpoint_validator.py
"""

import requests
import json
from typing import Dict, List, Tuple
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
PREDICTION_URL = "http://localhost:8002"
SIMULATION_URL = "http://localhost:8003"

# Test credentials
USERNAME = "admin"
PASSWORD = "Admin123456!"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class EndpointValidator:
    def __init__(self):
        self.token = None
        self.results = []
        self.test_user_id = None
        
    def print_header(self, title):
        print(f"\n{Colors.BLUE}{'='*80}")
        print(f"{title}")
        print(f"{'='*80}{Colors.END}\n")
        
    def print_status(self, endpoint, method, status_code, message=""):
        symbol = "✅" if 200 <= status_code < 300 else "❌" if status_code >= 400 else "⚠️"
        msg = f"{symbol} {method:6} {endpoint:40} [{status_code}]"
        if message:
            msg += f" - {message}"
        print(msg)
        self.results.append((endpoint, method, status_code, message))
        
    def test_login(self):
        """Test authentication"""
        self.print_header("🔐 AUTHENTICATION TEST")
        
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={"username": USERNAME, "password": PASSWORD},
                timeout=5
            )
            
            if response.status_code == 200:
                self.token = response.json().get("access_token")
                self.print_status("/auth/login", "POST", response.status_code, "Token acquired")
                return True
            else:
                self.print_status("/auth/login", "POST", response.status_code, "Login failed")
                return False
                
        except Exception as e:
            self.print_status("/auth/login", "POST", 0, f"Error: {str(e)}")
            return False
            
    def headers(self):
        """Return auth headers"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_health_checks(self):
        """Test health endpoints"""
        self.print_header("🏥 HEALTH CHECKS")
        
        services = [
            ("API Gateway", f"{BASE_URL}/health"),
            ("Prediction", f"{PREDICTION_URL}/health"),
            ("Simulation", f"{SIMULATION_URL}/health"),
        ]
        
        for name, url in services:
            try:
                response = requests.get(url, timeout=5)
                self.print_status(f"/health ({name})", "GET", response.status_code)
            except Exception as e:
                self.print_status(f"/health ({name})", "GET", 0, str(e))
    
    def test_user_management(self):
        """Test user CRUD endpoints"""
        self.print_header("👥 USER MANAGEMENT (CRUD)")
        
        if not self.token:
            print(f"{Colors.RED}❌ Skipped - No authentication token{Colors.END}")
            return
        
        # GET all users
        try:
            response = requests.get(
                f"{BASE_URL}/api/users",
                headers=self.headers(),
                timeout=5
            )
            self.print_status("/api/users", "GET", response.status_code)
        except Exception as e:
            self.print_status("/api/users", "GET", 0, str(e))
        
        # POST create user
        try:
            response = requests.post(
                f"{BASE_URL}/api/users",
                headers=self.headers(),
                json={
                    "username": f"testuser_{int(datetime.now().timestamp())}",
                    "email": f"test_{int(datetime.now().timestamp())}@hospital.com",
                    "password": "TestPassword123!",
                    "role": "MEDICO"
                },
                timeout=5
            )
            if response.status_code == 200:
                self.test_user_id = response.json().get("id")
                self.print_status("/api/users", "POST", response.status_code, f"Created user ID: {self.test_user_id}")
            else:
                self.print_status("/api/users", "POST", response.status_code, response.json().get("detail", ""))
        except Exception as e:
            self.print_status("/api/users", "POST", 0, str(e))
        
        # GET user by ID
        if self.test_user_id:
            try:
                response = requests.get(
                    f"{BASE_URL}/api/users/{self.test_user_id}",
                    headers=self.headers(),
                    timeout=5
                )
                self.print_status(f"/api/users/{{id}}", "GET", response.status_code)
            except Exception as e:
                self.print_status(f"/api/users/{{id}}", "GET", 0, str(e))
            
            # PUT update user
            try:
                response = requests.put(
                    f"{BASE_URL}/api/users/{self.test_user_id}",
                    headers=self.headers(),
                    json={"role": "ADMIN"},
                    timeout=5
                )
                self.print_status(f"/api/users/{{id}}", "PUT", response.status_code)
            except Exception as e:
                self.print_status(f"/api/users/{{id}}", "PUT", 0, str(e))
            
            # DELETE user
            try:
                response = requests.delete(
                    f"{BASE_URL}/api/users/{self.test_user_id}",
                    headers=self.headers(),
                    timeout=5
                )
                self.print_status(f"/api/users/{{id}}", "DELETE", response.status_code)
            except Exception as e:
                self.print_status(f"/api/users/{{id}}", "DELETE", 0, str(e))
        
        # GET /auth/me
        try:
            response = requests.get(
                f"{BASE_URL}/auth/me",
                headers=self.headers(),
                timeout=5
            )
            self.print_status("/auth/me", "GET", response.status_code)
        except Exception as e:
            self.print_status("/auth/me", "GET", 0, str(e))
    
    def test_filter_users_by_role(self):
        """Test user filtering"""
        self.print_header("🔍 USER FILTERING BY ROLE")
        
        if not self.token:
            print(f"{Colors.RED}❌ Skipped - No authentication token{Colors.END}")
            return
        
        roles = ["ADMIN", "MEDICO"]
        for role in roles:
            try:
                response = requests.get(
                    f"{BASE_URL}/api/users?role={role}",
                    headers=self.headers(),
                    timeout=5
                )
                self.print_status(f"/api/users?role={role}", "GET", response.status_code)
            except Exception as e:
                self.print_status(f"/api/users?role={role}", "GET", 0, str(e))
    
    def test_prediction_endpoints(self):
        """Test prediction endpoints"""
        self.print_header("🔮 PREDICTION SERVICE")
        
        if not self.token:
            print(f"{Colors.RED}❌ Skipped - No authentication token{Colors.END}")
            return
        
        # List models
        try:
            response = requests.get(
                f"{BASE_URL}/api/predictions/models",
                headers=self.headers(),
                timeout=5
            )
            self.print_status("/api/predictions/models", "GET", response.status_code)
        except Exception as e:
            self.print_status("/api/predictions/models", "GET", 0, str(e))
        
        # Get prediction history (dummy patient)
        try:
            response = requests.get(
                f"{BASE_URL}/api/predictions/P001",
                headers=self.headers(),
                timeout=5
            )
            self.print_status("/api/predictions/{patient_id}", "GET", response.status_code)
        except Exception as e:
            self.print_status("/api/predictions/{patient_id}", "GET", 0, str(e))
    
    def test_simulation_endpoints(self):
        """Test simulation endpoints"""
        self.print_header("🎬 SIMULATION SERVICE")
        
        if not self.token:
            print(f"{Colors.RED}❌ Skipped - No authentication token{Colors.END}")
            return
        
        # List scenarios
        try:
            response = requests.get(
                f"{BASE_URL}/api/simulations/scenarios",
                headers=self.headers(),
                timeout=5
            )
            self.print_status("/api/simulations/scenarios", "GET", response.status_code)
        except Exception as e:
            self.print_status("/api/simulations/scenarios", "GET", 0, str(e))
        
        # Get simulation history (dummy patient)
        try:
            response = requests.get(
                f"{BASE_URL}/api/simulations/P001",
                headers=self.headers(),
                timeout=5
            )
            self.print_status("/api/simulations/{patient_id}", "GET", response.status_code)
        except Exception as e:
            self.print_status("/api/simulations/{patient_id}", "GET", 0, str(e))
    
    def test_unauthenticated_endpoints(self):
        """Test endpoints that don't require auth"""
        self.print_header("🔓 UNAUTHENTICATED ENDPOINTS")
        
        endpoints = [
            ("POST", f"{BASE_URL}/prediccion"),
            ("POST", f"{BASE_URL}/prediccion/explain"),
            ("POST", f"{BASE_URL}/simulation"),
            ("POST", f"{BASE_URL}/statistics/wilcoxon"),
            ("POST", f"{BASE_URL}/statistics/friedman"),
        ]
        
        for method, url in endpoints:
            try:
                if method == "POST":
                    response = requests.post(url, json={}, timeout=5)
                else:
                    response = requests.get(url, timeout=5)
                    
                path = url.replace(BASE_URL, "")
                self.print_status(path, method, response.status_code)
            except Exception as e:
                self.print_status(url, method, 0, str(e))
    
    def print_summary(self):
        """Print test summary"""
        self.print_header("📊 TEST SUMMARY")
        
        total = len(self.results)
        passed = sum(1 for _, _, code, _ in self.results if 200 <= code < 300)
        partial = sum(1 for _, _, code, _ in self.results if 300 <= code < 400)
        failed = sum(1 for _, _, code, _ in self.results if code >= 400)
        errors = sum(1 for _, _, code, _ in self.results if code == 0)
        
        print(f"Total Tests:        {total}")
        print(f"{Colors.GREEN}✅ Passed:          {passed}{Colors.END}")
        print(f"{Colors.YELLOW}⚠️  Redirects:      {partial}{Colors.END}")
        print(f"{Colors.RED}❌ Failed (4xx):    {failed}{Colors.END}")
        print(f"{Colors.RED}❌ Errors (0):      {errors}{Colors.END}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        print(f"\n{Colors.BLUE}Success Rate: {success_rate:.1f}%{Colors.END}")
    
    def run_all_tests(self):
        """Run all validation tests"""
        print(f"{Colors.BLUE}")
        print("╔════════════════════════════════════════════════════════════════════════════════╗")
        print("║        SADECI-CORE ENDPOINT VALIDATOR - Complete Service Test                 ║")
        print("╚════════════════════════════════════════════════════════════════════════════════╝")
        print(f"{Colors.END}")
        
        self.test_login()
        self.test_health_checks()
        self.test_user_management()
        self.test_filter_users_by_role()
        self.test_prediction_endpoints()
        self.test_simulation_endpoints()
        self.test_unauthenticated_endpoints()
        self.print_summary()

if __name__ == "__main__":
    validator = EndpointValidator()
    validator.run_all_tests()
