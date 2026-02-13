/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package version

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMajorVersion(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{name: "full semver", input: "v1.0.0", expected: "v1"},
		{name: "full semver v0", input: "v0.3.1", expected: "v0"},
		{name: "full semver v2", input: "v2.5.10", expected: "v2"},
		{name: "major only", input: "v1", expected: "v1"},
		{name: "major only v0", input: "v0", expected: "v0"},
		{name: "empty string", input: "", expected: ""},
		{name: "whitespace only", input: "   ", expected: ""},
		{name: "with leading whitespace", input: "  v1.0.0", expected: "v1"},
		{name: "with trailing whitespace", input: "v1.0.0  ", expected: "v1"},
		{name: "no v prefix", input: "1.0.0", expected: "v1"},
		{name: "non-numeric", input: "vABC", expected: "vABC"},
		{name: "major and minor only", input: "v1.2", expected: "v1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := MajorVersion(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
