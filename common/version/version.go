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
	"fmt"
	"strconv"
	"strings"
)

// MajorVersion extracts the major version from a semver string.
// "v1.0.0" → "v1", "v0.3.1" → "v0", "v1" → "v1", "" → ""
func MajorVersion(v string) string {
	trimmed := strings.TrimSpace(v)
	if trimmed == "" {
		return trimmed
	}

	raw := strings.TrimPrefix(trimmed, "v")
	parts := strings.Split(raw, ".")
	if len(parts) == 0 {
		return trimmed
	}

	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return trimmed
	}

	return fmt.Sprintf("v%d", major)
}
