package com.company.itasset.controller.v1;

import com.company.itasset.dto.request.BranchDto;
import com.company.itasset.dto.response.ApiResponse;
import com.company.itasset.entity.Branch;
import com.company.itasset.exception.ResourceNotFoundException;
import com.company.itasset.exception.ValidationException;
import com.company.itasset.repository.BranchRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchRepository branchRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Branch>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(branchRepository.findByActiveTrue(), "Branches fetched"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Branch>> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                branchRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Branch","id",id)),
                "Branch found"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> create(@Valid @RequestBody BranchDto dto) {
        if (branchRepository.existsByName(dto.getName()))
            throw new ValidationException("name", "Branch name already exists");
        Branch branch = Branch.builder().name(dto.getName()).location(dto.getLocation())
                .city(dto.getCity()).country(dto.getCountry()).contactEmail(dto.getContactEmail()).build();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(branchRepository.save(branch), "Branch created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> update(@PathVariable Long id, @Valid @RequestBody BranchDto dto) {
        Branch b = branchRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Branch","id",id));
        b.setName(dto.getName()); b.setLocation(dto.getLocation());
        b.setCity(dto.getCity()); b.setCountry(dto.getCountry()); b.setContactEmail(dto.getContactEmail());
        return ResponseEntity.ok(ApiResponse.success(branchRepository.save(b), "Branch updated"));
    }
}
