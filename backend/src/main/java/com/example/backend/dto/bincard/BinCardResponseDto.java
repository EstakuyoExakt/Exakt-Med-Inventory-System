package com.example.backend.dto.bincard;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BinCardResponseDto {

    private BinCardHeaderDto header;
    private List<BinCardEntryDto> entries = new ArrayList<>();
}
