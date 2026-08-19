package com.company.itasset.repository;

import com.company.itasset.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long> {
    List<Branch> findByActiveTrue();
    Optional<Branch> findByName(String name);
    boolean existsByName(String name);
}
