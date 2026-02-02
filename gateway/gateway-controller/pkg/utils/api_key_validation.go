/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
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

package utils

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/wso2/api-platform/gateway/gateway-controller/pkg/constants"
)

const (
	apiKeyNameMinLength = 3
	apiKeyNameMaxLength = 63
)

var (
	// validAPIKeyNameRegex matches lowercase alphanumeric with hyphens (not at start/end, no consecutive)
	validAPIKeyNameRegex = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	// invalidCharsRegex matches any character that is not alphanumeric, hyphen, underscore, or space
	invalidCharsRegex = regexp.MustCompile(`[^a-z0-9\-_ ]`)
	// multipleHyphensRegex matches consecutive hyphens
	multipleHyphensRegex = regexp.MustCompile(`-+`)
)

// ValidateAPIKeyValue validates a plain API key value for creation or update.
// Use this for both REST create/update and external events (apikey.created, apikey.updated).
// Returns a descriptive error if the key is empty, too short, or too long.
func ValidateAPIKeyValue(plainKey string) error {
	trimmed := strings.TrimSpace(plainKey)
	if trimmed == "" {
		return fmt.Errorf("API key cannot be empty")
	}
	if len(trimmed) < constants.MIN_API_KEY_LENGTH {
		return fmt.Errorf("API key is too short (minimum %d characters required)", constants.MIN_API_KEY_LENGTH)
	}
	if len(trimmed) > constants.MAX_API_KEY_LENGTH {
		return fmt.Errorf("API key is too long (maximum %d characters allowed)", constants.MAX_API_KEY_LENGTH)
	}
	return nil
}

// ValidateDisplayName validates the user-provided display name for an API key.
// Display name must be 1-100 UTF-8 characters.
func ValidateDisplayName(displayName string) error {
	trimmed := strings.TrimSpace(displayName)
	if trimmed == "" {
		return fmt.Errorf("display name cannot be empty")
	}
	if len(trimmed) > 100 {
		return fmt.Errorf("display name is too long (maximum 100 characters allowed)")
	}
	return nil
}

// GenerateAPIKeyName generates a URL-safe name from a display name.
// Transforms the displayName by:
// - Converting to lowercase
// - Replacing spaces and underscores with hyphens
// - Removing invalid characters
// - Collapsing consecutive hyphens
// - Trimming leading/trailing hyphens
// - Enforcing length constraints (3-63 chars)
func GenerateAPIKeyName(displayName string) (string, error) {
	if strings.TrimSpace(displayName) == "" {
		return "", fmt.Errorf("display name cannot be empty")
	}

	// Convert to lowercase
	name := strings.ToLower(displayName)

	// Replace spaces and underscores with hyphens
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.ReplaceAll(name, "_", "-")

	// Remove invalid characters
	name = invalidCharsRegex.ReplaceAllString(name, "")

	// Collapse multiple hyphens into single hyphen
	name = multipleHyphensRegex.ReplaceAllString(name, "-")

	// Trim leading and trailing hyphens
	name = strings.Trim(name, "-")

	// Enforce max length
	if len(name) > apiKeyNameMaxLength {
		name = name[:apiKeyNameMaxLength]
		// Trim trailing hyphen if truncation created one
		name = strings.TrimRight(name, "-")
	}

	// If name is too short after sanitization, return error
	if len(name) < apiKeyNameMinLength {
		return "", fmt.Errorf("generated name '%s' is too short (minimum %d characters required after sanitization)", name, apiKeyNameMinLength)
	}

	return name, nil
}
